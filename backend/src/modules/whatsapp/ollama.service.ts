import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { circuitBreakerState, ollamaGenerationDuration } from "../../lib/metrics.js";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class OllamaService {
  // Circuit Breaker state variables
  private static state: CircuitState = "CLOSED";
  private static nextAttemptTime = 0;
  private static consecutiveFailures = 0;
  private static FAILURE_THRESHOLD = 3;
  private static COOLDOWN_MS = 60000; // 60 seconds
  private static REQUEST_TIMEOUT_MS = 45000; // 45 seconds

  /**
   * Identifies transient, network, or resource exhaustion errors.
   */
  private static isNetworkOrOllamaError(err: any): boolean {
    const msg = (err.message || String(err)).toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("connection refused") ||
      msg.includes("unavailable") ||
      msg.includes("oom") ||
      msg.includes("out of memory") ||
      msg.includes("abort") ||
      msg.includes("fetch failed")
    );
  }

  /**
   * Helper to perform fetch requests governed by a Circuit Breaker.
   */
  private static async fetchWithCircuitBreaker(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const now = Date.now();
    
    if (this.state === "OPEN") {
      if (now >= this.nextAttemptTime) {
        this.state = "HALF_OPEN";
        const elapsed = now - (this.nextAttemptTime - this.COOLDOWN_MS);
        circuitBreakerState.set(0.5); // 0.5 for HALF_OPEN
        logger.warn({ elapsed }, "Circuit Breaker state changed to HALF_OPEN. Testing connection...");
      } else {
        throw new Error("Ollama Circuit Breaker is OPEN. Fast-failing request.");
      }
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      
      if (response.ok) {
        if (this.state === "HALF_OPEN" || this.consecutiveFailures > 0) {
          const prevFailures = this.consecutiveFailures;
          this.state = "CLOSED";
          this.consecutiveFailures = 0;
          circuitBreakerState.set(0);
          logger.info({ prevFailures }, "Circuit Breaker state changed to CLOSED. Connection restored.");
        }
        return response;
      } else {
        // If 5xx, treat as Ollama failure
        if (response.status >= 500) {
          throw new Error(`Ollama unavailable (HTTP ${response.status})`);
        }
        return response; // 4xx errors are client errors, not circuit breaker issues
      }
    } catch (err: any) {
      clearTimeout(id);
      
      if (this.isNetworkOrOllamaError(err)) {
        this.recordFailure(err);
      }
      throw err;
    }
  }

  private static recordFailure(err: any) {
    this.consecutiveFailures++;
    
    if (this.state === "HALF_OPEN" || this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.COOLDOWN_MS;
      circuitBreakerState.set(1);
      logger.error({ err: err.message, failures: this.consecutiveFailures, cooldown: this.COOLDOWN_MS }, "Circuit Breaker state changed to OPEN.");
    } else {
      logger.warn({ err: err.message, failures: this.consecutiveFailures, threshold: this.FAILURE_THRESHOLD }, "Circuit Breaker failure recorded.");
    }
  }

  /**
   * Performs a chat completion using Ollama.
   */
  static async chat(
    messages: { role: string; content: string }[],
    options: { temperature?: number; top_p?: number; num_predict?: number; format?: string; rawOptions?: any } = {}
  ): Promise<{ message: { role: string; content: string } }> {
    const url = `${env.OLLAMA_BASE_URL}/api/chat`;
    
    const { format, rawOptions, ...restOptions } = options;
    const formatValue = format || (rawOptions && rawOptions.format) || undefined;
    const cleanRaw = { ...rawOptions };
    if (cleanRaw.format) delete cleanRaw.format;

    const endTimer = ollamaGenerationDuration.startTimer();
    try {
      const response = await this.fetchWithCircuitBreaker(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages,
        stream: false,
        format: formatValue,
        options: {
          temperature: restOptions.temperature ?? 0.3,
          top_p: restOptions.top_p ?? 0.9,
          num_predict: restOptions.num_predict ?? 512,
          ...cleanRaw,
        },
      }),
    });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama chat failed with status ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as any;
      endTimer();
      return data;
    } catch (err) {
      endTimer();
      throw err;
    }
  }

  /**
   * Performs a single prompt completion using Ollama.
   */
  static async generate(
    prompt: string,
    options: { temperature?: number; top_p?: number; format?: string; rawOptions?: any } = {}
  ): Promise<{ response: string }> {
    const url = `${env.OLLAMA_BASE_URL}/api/generate`;

    const { format, rawOptions, ...restOptions } = options;
    const formatValue = format || (rawOptions && rawOptions.format) || undefined;
    const cleanRaw = { ...rawOptions };
    if (cleanRaw.format) delete cleanRaw.format;

    const endTimer = ollamaGenerationDuration.startTimer();
    try {
      const response = await this.fetchWithCircuitBreaker(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt,
        stream: false,
        format: formatValue,
        options: {
          temperature: restOptions.temperature ?? 0.3,
          top_p: restOptions.top_p ?? 0.9,
          ...cleanRaw,
        },
      }),
    });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama generate failed with status ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as any;
      endTimer();
      return data;
    } catch (err) {
      endTimer();
      throw err;
    }
  }

  /**
   * Streams a prompt completion from Ollama.
   */
  static async stream(
    prompt: string,
    onChunk: (text: string) => void,
    options: { temperature?: number; top_p?: number; format?: string; rawOptions?: any } = {}
  ): Promise<void> {
    const url = `${env.OLLAMA_BASE_URL}/api/generate`;

    const { format, rawOptions, ...restOptions } = options;
    const formatValue = format || (rawOptions && rawOptions.format) || undefined;
    const cleanRaw = { ...rawOptions };
    if (cleanRaw.format) delete cleanRaw.format;

    const response = await this.fetchWithCircuitBreaker(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt,
        stream: true,
        format: formatValue,
        options: {
          temperature: restOptions.temperature ?? 0.3,
          top_p: restOptions.top_p ?? 0.9,
          ...cleanRaw,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama stream failed with status ${response.status}: ${errText}`);
    }

    const body = response.body;
    if (!body) return;

    const reader = body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              onChunk(parsed.response);
            }
          } catch (e) {
            // Ignore partial line json parsing errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

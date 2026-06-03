import { env } from "../../config/env.js";

export class OllamaService {
  // Circuit Breaker state variables
  private static circuitOpen = false;
  private static nextAttemptTime = 0;
  private static consecutiveFailures = 0;
  private static FAILURE_THRESHOLD = 3;
  private static COOLDOWN_MS = 60000; // 1 minute cooldown

  /**
   * Helper to perform fetch requests with a timeout, retry, and circuit breaker logic.
   */
  private static async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number }
  ): Promise<Response> {
    const { timeout = 5000, retries = 1, ...fetchOptions } = options; // Default timeout 5s, retries 1
    
    // Check Circuit Breaker
    const now = Date.now();
    if (this.circuitOpen) {
      if (now > this.nextAttemptTime) {
        // Cooldown period expired, try to half-open the circuit
        this.circuitOpen = false;
        console.log("[Ollama Service] Circuit breaker HALF-OPEN. Attempting connection...");
      } else {
        // Circuit is open, fail fast
        throw new Error("Ollama circuit breaker is OPEN. Fast-failing to fallback.");
      }
    }

    let attempt = 0;
    
    while (attempt <= retries) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });
        clearTimeout(id);
        
        if (response.ok) {
          // Success! Reset consecutive failures
          this.consecutiveFailures = 0;
          this.circuitOpen = false;
        } else {
          // Response not ok, treat as failure
          this.handleFailure();
        }

        return response;
      } catch (err: any) {
        clearTimeout(id);
        attempt++;
        if (attempt > retries) {
          this.handleFailure();
          throw err;
        }
        // Wait with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }
    this.handleFailure();
    throw new Error("Request failed after retries");
  }

  private static handleFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.circuitOpen = true;
      this.nextAttemptTime = Date.now() + this.COOLDOWN_MS;
      console.warn(`[Ollama Service] Circuit breaker OPENED for 60s after ${this.consecutiveFailures} consecutive failures.`);
    }
  }

  /**
   * Performs a chat completion using Ollama.
   */
  static async chat(
    messages: { role: string; content: string }[],
    options: { temperature?: number; top_p?: number; num_predict?: number; rawOptions?: any } = {}
  ): Promise<{ message: { role: string; content: string } }> {
    const url = `${env.OLLAMA_BASE_URL}/api/chat`;
    
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          top_p: options.top_p ?? 0.9,
          num_predict: options.num_predict ?? 512,
          ...options.rawOptions,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama chat failed with status ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as any;
    return data;
  }

  /**
   * Performs a single prompt completion using Ollama.
   */
  static async generate(
    prompt: string,
    options: { temperature?: number; top_p?: number; rawOptions?: any } = {}
  ): Promise<{ response: string }> {
    const url = `${env.OLLAMA_BASE_URL}/api/generate`;

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          top_p: options.top_p ?? 0.9,
          ...options.rawOptions,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama generate failed with status ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as any;
    return data;
  }

  /**
   * Streams a prompt completion from Ollama.
   */
  static async stream(
    prompt: string,
    onChunk: (text: string) => void,
    options: { temperature?: number; top_p?: number; rawOptions?: any } = {}
  ): Promise<void> {
    const url = `${env.OLLAMA_BASE_URL}/api/generate`;

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.3,
          top_p: options.top_p ?? 0.9,
          ...options.rawOptions,
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

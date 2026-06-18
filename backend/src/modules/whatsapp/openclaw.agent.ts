import { OllamaService } from "./ollama.service.js";
import * as tools from "./openclaw.tools.js";
import { prisma } from "../../prisma/index.js";

const SYSTEM_PROMPT = `You are the Ishan Technologies Property Assistant, an expert real estate consultant.
You communicate via WhatsApp. Your replies must be warm, professional, helpful, and scannable.

Available Tools:
1. searchProperties(budget?: number, city?: string, location?: string, propertyType?: string, BHK?: number, amenities?: string)
   - Searches active properties. Budget should be in Lakhs (e.g. 80 Lakhs). propertyType can be "flat", "villa", "plot", etc.
2. getPropertyDetails(propertyId: string)
   - Gets details of a specific property.
3. createLead(name: string, phone: string, email?: string, budget?: number, location?: string, propertyType?: string, propertyId: string, notes?: string)
   - Registers a customer as a CRM lead for a specific property. Use this when the user says "I am interested", "contact me", or wants to buy/rent.
4. scheduleSiteVisit(phone: string, propertyId: string, date: string, time: string, notes?: string)
   - Schedules a physical tour of the property. Date must be YYYY-MM-DD and Time must be HH:MM.

Rules for Tool Calling:
- When a user asks to search for properties, extract parameters and call "searchProperties".
- When a user selects or shows interest in a property, call "getPropertyDetails" if details are missing, or call "createLead" if they want to proceed.
- When a user asks to visit/tour a property, ask for date and time, then call "scheduleSiteVisit".
- To call a tool, you must reply in JSON format with "thought" and "toolCall":
  {
    "thought": "I need to search for 3 BHK apartments in Gota under 80 lakh",
    "toolCall": {
      "name": "searchProperties",
      "arguments": { "BHK": 3, "location": "Gota", "budget": 80, "propertyType": "flat" }
    }
  }
- If you do not need to call a tool, reply in JSON format with "thought" and "response":
  {
    "thought": "Greeting the user and listing the properties found.",
    "response": "Here are the properties matching your request..."
  }
- ALWAYS output valid JSON. Do not include markdown code block syntax around your JSON; output the raw JSON string directly.

Rules for Presenting Properties:
Present matching properties in this exact WhatsApp-friendly format:
✨ *Property [N]* (or ID)
📍 *Location:* [Location/Address]
🏢 *Type:* [Type]
🛏️ *Configuration:* [BHK] BHK
📐 *Size:* [Area] sqft
💰 *Price:* ₹[Price in Lakhs] Lakh
✅ *Status:* Available

Never invent or assume any property details. Only state what is returned by the search tool.
If no properties are found, explain that no matches are currently available and suggest adjusting budget or location.
`;

export async function runOpenClawAgent(params: {
  phone: string;
  pushName?: string;
  userMessage: string;
}): Promise<string> {
  const { phone, pushName, userMessage } = params;
  const cleanPhone = phone.replace(/[^0-9]/g, "");

  // Protect against context bloating / DoS attacks
  let truncatedMessage = userMessage;
  if (truncatedMessage.length > 1000) {
    truncatedMessage = truncatedMessage.substring(0, 1000) + "... [truncated]";
  }

  const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

  // 1. Fetch conversation history from SQL
  let customer = await prisma.customer.findFirst({
    where: { phone: { endsWith: last10 } },
    include: { conversations: true },
  });

  let history: { role: string; content: string }[] = [];

  if (customer && customer.conversations.length > 0) {
    const conv = customer.conversations[0];
    try {
      const msgs = JSON.parse(conv.messages);
      if (Array.isArray(msgs)) {
        // Load last 10 messages
        history = msgs.slice(-10).map((m: any) => ({
          role: m.from === "customer" ? "user" : "assistant",
          content: m.text,
        }));
      }
    } catch (e) {
      console.error("[Agent] Error parsing history messages", e);
    }
  }

  // Append current user message
  history.push({ role: "user", content: truncatedMessage });

  let chatMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
  ];

  let loopCount = 0;
  let finalResponse = "";

  while (loopCount < 3) {
    loopCount++;
    console.log(`[Agent] Calling Ollama (Loop ${loopCount})`);
    
    let modelReply = "";
    try {
      const response = await OllamaService.chat(chatMessages, {
        temperature: 0.2,
        rawOptions: {
          format: "json", // Instruct Ollama to force JSON output
        },
      });
      modelReply = response.message.content.trim();
    } catch (err: any) {
      console.error("[Agent] Ollama connection failed", err.message);
      // Fallback with DB search capability
      finalResponse = await getFallbackResponse(truncatedMessage);
      break;
    }

    console.log(`[Agent] Model Reply: ${modelReply}`);

    // Parse the JSON reply
    let parsed: any = null;
    let cleanReply = modelReply.trim();
    if (cleanReply.startsWith("```")) {
      // Strip markdown code blocks
      cleanReply = cleanReply.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    try {
      parsed = JSON.parse(cleanReply);
    } catch (e) {
      // If parsing fails, try to extract JSON block using regex
      const match = cleanReply.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (innerErr) {
          console.error("[Agent] Regex JSON parse error");
        }
      }
    }

    // If still not parsed, treat it as a conversational message fallback
    if (!parsed) {
      finalResponse = modelReply;
      break;
    }

    // Check if it's a tool call
    if (parsed.toolCall) {
      const toolName = parsed.toolCall.name;
      const toolArgs = parsed.toolCall.arguments || {};
      console.log(`[Agent] Executing tool: ${toolName} with args:`, toolArgs);

      let toolResult: any = null;
      try {
        if (toolName === "searchProperties") {
          toolResult = await tools.searchProperties(toolArgs);
        } else if (toolName === "getPropertyDetails") {
          toolResult = await tools.getPropertyDetails(toolArgs);
        } else if (toolName === "createLead") {
          const args = { ...toolArgs, phone: toolArgs.phone || cleanPhone };
          toolResult = await tools.createLead(args);
        } else if (toolName === "scheduleSiteVisit") {
          const args = { ...toolArgs, phone: toolArgs.phone || cleanPhone };
          toolResult = await tools.scheduleSiteVisit(args);
        } else {
          toolResult = `Tool ${toolName} not found.`;
        }
      } catch (err: any) {
        console.error(`[Agent] Tool ${toolName} execution error:`, err.message);
        toolResult = `Error executing tool: ${err.message}`;
      }

      console.log(`[Agent] Tool Result:`, JSON.stringify(toolResult));

      // Append assistant's tool-call response and the tool output to history
      chatMessages.push({ role: "assistant", content: modelReply });
      chatMessages.push({
        role: "user",
        content: `TOOL_RESULT [${toolName}]: ${JSON.stringify(toolResult)}`,
      });
    } else {
      // No tool call, we have a final response
      finalResponse = parsed.response || parsed.text || modelReply;
      break;
    }
  }

  if (!finalResponse) {
    finalResponse = "Thank you for reaching out! Let me check that and connect you with an agent.";
  }

  // 2. Save the dialogue to SQL database via saveConversation tool
  try {
    await tools.saveConversation({
      phone: cleanPhone,
      pushName,
      messages: [
        { from: "customer", text: truncatedMessage, timestamp: new Date().toISOString() },
        { from: "agent", text: finalResponse, timestamp: new Date().toISOString() },
      ],
    });
  } catch (dbErr) {
    console.error("[Agent] Failed to persist conversation to PostgreSQL database", dbErr);
  }

  return finalResponse;
}

async function getFallbackResponse(userMessage: string): Promise<string> {
  const text = userMessage.toLowerCase();
  
  // Extract BHK configuration from message
  const bhkMatch = text.match(/(\d+)\s*bhk/i);
  const BHK = bhkMatch ? parseInt(bhkMatch[1], 10) : undefined;
  
  // Extract budget
  let budget: number | undefined = undefined;
  const budgetMatch = text.match(/(\d+(?:\.\d+)?)\s*(lakh|lacs|lac)/i);
  if (budgetMatch) {
    budget = parseFloat(budgetMatch[1]);
  } else {
    const crMatch = text.match(/(\d+(?:\.\d+)?)\s*(crore|cr)/i);
    if (crMatch) {
      budget = parseFloat(crMatch[1]) * 100; // convert to Lakhs
    }
  }

  // Extract location
  let location: string | undefined = undefined;
  if (text.includes("gota")) location = "Gota";
  else if (text.includes("sg highway") || text.includes("s.g. highway")) location = "SG Highway";
  else if (text.includes("ahmedabad")) location = "Ahmedabad";

  // Extract property type
  let propertyType: string | undefined = undefined;
  if (text.includes("flat") || text.includes("apartment")) propertyType = "flat";
  else if (text.includes("villa") || text.includes("bungalow") || text.includes("house")) propertyType = "villa";
  else if (text.includes("plot") || text.includes("land")) propertyType = "plot";

  // Extract status (rent vs buy)
  let status: string | undefined = undefined;
  if (text.includes("rent") || text.includes("rental") || text.includes("lease")) {
    status = "FOR_RENT";
  } else if (text.includes("buy") || text.includes("sale") || text.includes("purchase")) {
    status = "FOR_SALE";
  }

  if (BHK || budget || location || propertyType || status) {
    try {
      const properties = await tools.searchProperties({
        budget,
        location,
        propertyType,
        BHK,
        status,
      });

      if (properties && properties.length > 0) {
        let responseText = `🏠 *Ishan Technologies Property Assistant* (Graceful Fallback Mode)\n\nI found the following matching properties in our database:\n\n`;
        properties.forEach((p, idx) => {
          responseText += `✨ *Property ${idx + 1}:* ${p.title}\n`;
          responseText += `📍 *Location:* ${p.address}, ${p.city}\n`;
          responseText += `🛏️ *Configuration:* ${p.bhk} BHK\n`;
          responseText += `💰 *Price:* ₹${p.price >= 10000000 ? (p.price / 10000000).toFixed(2) + " Cr" : (p.price / 100000).toFixed(0) + " Lakh"}\n\n`;
        });
        responseText += `If you are interested in any of these, please reply with the property name or ask to "schedule a visit"!`;
        return responseText;
      }
    } catch (e) {
      console.error("[Fallback Search Error]", e);
    }
  }

  if (text.includes("bhk") || text.includes("flat") || text.includes("villa") || text.includes("lakh") || text.includes("rent") || text.includes("rental")) {
    return `🏠 *Ishan Technologies Property Assistant*\n\nI've received your requirements for a property. Let me look up matching listings in Gota and Ahmedabad from our database. An agent will contact you shortly with the catalog!`;
  }
  if (text.includes("schedule") || text.includes("visit") || text.includes("tour")) {
    return `📅 *Ishan Technologies Property Assistant*\n\nI can help schedule a visit! Our agents are available Mon-Sat, 9AM to 6PM. I will register this request and have an agent call you to finalize the date and time.`;
  }
  return `Thank you for reaching out to Ishan Technologies! We've received your request and will connect you with a property expert shortly.`;
}

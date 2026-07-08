# Property Search Automation: n8n + Google Sheets

**Phase 1 Prototype** | Early Validation Stage | Developed in parallel with OpenClaw

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Data Flow & Processing Pipeline](#data-flow--processing-pipeline)
4. [System Components](#system-components)
5. [Node-by-Node Breakdown](#node-by-node-breakdown)
6. [Data Storage Model](#data-storage-model)
7. [How It Works: Step by Step](#how-it-works-step-by-step)
8. [Limitations](#limitations)
9. [Project Evolution](#project-evolution)
10. [Deployment & Setup](#deployment--setup)

---

## Overview

This is the **initial prototype** of the Property Property CRM WhatsApp automation system, created to validate core business logic:

- Can users describe their property requirements conversationally on WhatsApp?
- Can we extract structured data from free-form text using AI?
- Can we match properties and maintain conversation context across multiple messages?

### Key Characteristics

| Aspect | Details |
|--------|---------|
| **Purpose** | Proof-of-concept validation |
| **Storage** | Google Sheets (both inventory and session data) |
| **AI Model** | Ollama (Llama 3.1:8B) for entity extraction |
| **Messaging** | Meta WhatsApp Cloud API |
| **Execution** | n8n workflow orchestration |
| **Session Memory** | Google Sheets-based |
| **Processing Type** | Synchronous (per-message) |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SYSTEMS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WhatsApp User                Google Sheets                    Ollama        │
│      (Chat)           ────────(Inventory + Session)──────    (LLM)          │
│                       │                                       │              │
└───────────┬───────────┼───────────────────────────────────────┼──────────────┘
            │           │                                       │
            ▼           │                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         n8n WORKFLOW LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Receive Message          2. Filter & Dedup          3. Extract Text    │
│  ────────────────────────────────────────────────────────────────          │
│  WhatsApp Webhook     →    Prevent Duplicates    →    Extract Body        │
│  (Meta Trigger)            (Meta Retry Protection)      (Set Node)         │
│          │                         │                         │             │
│          └─────────────────────────┴─────────────────────────┘             │
│                                    │                                        │
│                                    ▼                                        │
│  7. Send Response         6. Format Message         5. Filter & Match      │
│  ─────────────────────────────────────────────────────────────────        │
│  WhatsApp API     ◄──    Create WhatsApp    ◄──    Download Inventory    │
│  (Send Message)         Formatted Text            Apply Filters          │
│                                 │                      (JavaScript)        │
│                                 │                         │                │
│                                 └─────────────────────────┘                │
│                                                                              │
│                 4. Intelligence Layer                                       │
│                 ─────────────────────────────────────────                 │
│        ┌─────────────────────────────────────────────────────┐             │
│        │                                                     │              │
│        │   ┌─────────────────────────────────────────┐      │              │
│        │   │ Greeting Check                          │      │              │
│        │   │ (User says: hi, hello, reset, etc)     │      │              │
│        │   └────────────┬────────────────────────────┘      │              │
│        │                │                                    │              │
│        │                ▼                                    │              │
│        │   ┌──────────────────────────┐                      │              │
│        │   │ Agent Request Check      │                      │              │
│        │   │ (User says: "agent")     │                      │              │
│        │   └──────────┬───────────────┘                      │              │
│        │              │                                      │              │
│        │              ▼                                      │              │
│        │   ┌──────────────────────────────────────────┐     │              │
│        │   │ Extract Entities via LLM                │     │              │
│        │   │ (Ollama: Location, Type, Budget)       │     │              │
│        │   └──────────┬───────────────────────────────┘     │              │
│        │              │                                      │              │
│        │              ▼                                      │              │
│        │   ┌──────────────────────────────────────────┐     │              │
│        │   │ Merge with Session History              │     │              │
│        │   │ (Combine new data + conversation)       │     │              │
│        │   └──────────┬───────────────────────────────┘     │              │
│        │              │                                      │              │
│        │              ▼                                      │              │
│        │   ┌──────────────────────────────────────────┐     │              │
│        │   │ Check Completeness                      │     │              │
│        │   │ (Location + Type + Budget?)             │     │              │
│        │   └──────────┬───────────────────────────────┘     │              │
│        │              │                                      │              │
│        └──────────────┼──────────────────────────────────────┘              │
│                       │                                                     │
│                       ├─────────────────────┬──────────────────────        │
│            (IF Complete)                  (IF Incomplete)                  │
│                       │                       │                            │
│                       ▼                       ▼                            │
│        Google Sheets     Ask for Missing Info                             │
│        Property Search   Save Session State                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow & Processing Pipeline

### Message Lifecycle

```
User Types Message on WhatsApp
        │
        ▼
Meta WhatsApp Cloud API (webhook delivery)
        │
        ▼
n8n Trigger: "Receive WhatsApp Message"
        │
        ├─────────────────────────────────────────────┐
        │                                             │
        ▼                                             ▼
Is it a valid                              Extract duplicate check:
text message?                              (phone_id + message_id)
        │
        ├─ YES ──────────────────────────────────────┐
        │                                             │
        └─ NO (ignore) ◄─────────────────────────────┘
                                                      │
                                                      ▼
                                            Mark as processed in
                                            Workflow Static Data
                                                      │
                                                      ▼
                                        Extract message text body
                                                      │
                                        ┌─────────────┴─────────────┐
                                        │                           │
                                        ▼                           ▼
                            Is greeting or reset?        Greeting detected?
                            ('hi', 'hello', etc)                 │
                                        │                        ▼
                                        ├─ YES ──────────────────────┐
                                        │                            │
                                        └─ NO ─────────┐             │
                                                       │             │
                                         ┌─────────────┘             │
                                         │                           │
                                         ▼                           ▼
                        Did user ask for agent?      Clear Session
                        ('agent' keyword)              Send Menu
                                         │
                                         ├─ YES ─────────────────┐
                                         │                       │
                                         └─ NO ────┐             │
                                                   │             │
                                     ┌─────────────┘             │
                                     │                           │
                                     ▼                           ▼
                      Invoke LLM:                    Agent Handoff
                      Extract Real Estate Entities  (Contact escalation)
                                     │
                                     ▼
                      Parse JSON: Location, Type,
                      Budget, Size, Bedrooms
                                     │
                                     ▼
                      Merge with conversation history
                      (via Google Sheets session store)
                                     │
                                     ▼
                      Check if READY to search:
                      Location ✓ + Type ✓ + Budget ✓
                                     │
                      ┌──────────────┴──────────────┐
                      │                             │
                      ▼ YES                         ▼ NO
                  Download entire inventory    Ask for missing fields
                  from Google Sheets              Save current state
                      │                           Return message
                      │
                      ▼
                  Apply JavaScript filters
                  (location, type, price range,
                   size, bedrooms)
                      │
                      ├─ Properties found?
                      │
                      ├─ YES ──────────────────┐
                      │                        │
                      └─ NO ────────┐          │
                                   │          │
                        Send "No matches"    Format properties
                        Save session         (property list)
                                   │          │
                                   │          ▼
                                   │      Send WhatsApp message
                                   │      (property details)
                                   │          │
                                   │          ▼
                                   └──────────┘
                                        │
                                        ▼
                          Clear session, ready for
                          next user message
```

---

## System Components

### 1. **WhatsApp Integration Layer**

| Component | Role | Tech |
|-----------|------|------|
| **Receive WhatsApp Message** | Trigger that listens for incoming webhooks from Meta | n8n WhatsApp Trigger |
| **Send WhatsApp Message** | Sends AI-generated replies back to user | n8n WhatsApp API |
| **Webhook Management** | Handles webhook signatures and verification | Meta-managed |

### 2. **Data Validation & Deduplication**

| Component | Role | Logic |
|-----------|------|-------|
| **Filter Webhooks & Prevent Duplicates** | Prevents processing the same message twice | JavaScript: Maintains last 200 message IDs in workflow static data; checks `phone:message_id` pair |
| **Extract Message Text** | Isolates message content | n8n Set node: extracts `messages[0].text.body` |
| **Is it a Greeting or Reset?** | Detects user greetings | Regex: matches hi, hello, hey, reset, start, etc. |

### 3. **Intelligence Layer (LLM-Powered)**

| Component | Role | Details |
|-----------|------|---------|
| **Extract Real Estate Entities** | LLM-based entity extraction | Uses Ollama (Llama 3.1:8B) with custom system prompt |
| **Ollama Chat Model** | Language model inference | Temperature 0.2, Top-P 0.7 (deterministic) |
| **JSON Parser** | Converts LLM output to structured data | Extracts: Location, Type, Size_sqft, Price_Lakh, Bedrooms + operators (max, min, between, etc) |

### 4. **Session Management & Storage**

| Component | Role | Storage |
|-----------|------|---------|
| **Google Sheets Session Store** | Persistent user context | Google Sheet (tab: `conversation_sessions`) |
| **Merge with History** | Combines current input with prior conversation | JavaScript: fetches sheet → merges JSON → saves back |
| **Session Lifecycle** | Tracks location, type, budget across turns | One row per user phone; updated per turn |

### 5. **Property Inventory & Search**

| Component | Role | Storage |
|-----------|------|---------|
| **Download Entire Inventory** | Fetches all properties | Google Sheets (tab: `properties`) |
| **Apply Filters** | JavaScript-based property matching | Filters by: location, type, price range, size, bedrooms |
| **Format Properties** | Creates WhatsApp-friendly message | JavaScript: loops through matches, formats text |

---

## Node-by-Node Breakdown

### **Node 1: Receive WhatsApp Message**
- **Type**: n8n WhatsApp Trigger
- **Purpose**: Listen for incoming messages
- **Output**: 
  ```json
  {
    "messages": [{"id": "msg_id", "type": "text", "text": {"body": "..."}}],
    "contacts": [{"wa_id": "+1234567890"}]
  }
  ```
- **Why**: Meta pushes webhooks; n8n automatically decodes and verifies signatures

---

### **Node 2: Filter Webhooks & Prevent Duplicates**
- **Type**: Code node (JavaScript)
- **Purpose**: Stop duplicate processing from Meta retries
- **Logic**:
  ```javascript
  staticData.processedIds[`${phone}:${msgId}`] = timestamp;
  // If already exists → return [] (silently stop)
  // Memory limit: keep last 200 IDs
  ```
- **Why**: Meta sometimes resends the same message; static data persists across workflow runs

---

### **Node 3: Extract Message Text**
- **Type**: Set node (data mapper)
- **Purpose**: Isolate the user's message content
- **Output**: `{ "messages[0].text.body": "flat in ahmedabad under 80 lakh" }`

---

### **Node 4: Is it a Greeting or Reset?**
- **Type**: If node (conditional)
- **Purpose**: Branch on user greeting keywords
- **Condition**: Text matches `['hi', 'hello', 'hey', 'reset', 'restart', 'start']`
- **Branches**:
  - **True**: Clear session, send menu
  - **False**: Continue to agent check

---

### **Node 5: Did user ask for Agent?**
- **Type**: If node (conditional)
- **Purpose**: Detect escalation request
- **Condition**: Text === `'agent'`
- **Branches**:
  - **True**: Send "Agent Handoff" message
  - **False**: Proceed to LLM extraction

---

### **Node 6: Extract Real Estate Entities**
- **Type**: LangChain Agent with Ollama
- **Purpose**: Parse property requirements from free-form text
- **LLM Prompt**: 
  - Extracts: Location, Type, Size_sqft, Price_Lakh, Bedrooms
  - Maps operators: `max`, `min`, `between`, `approx`, `exact`, `any`
  - Outputs strict JSON with 13 fields
  - Example input: `"flat in ahmedabad under 80 lakh"`
  - Example output:
    ```json
    {
      "reply": "Let me check matching properties for you.",
      "Location": "ahmedabad",
      "Type": "flat",
      "Price_Lakh": "80",
      "Price_Lakh_op": "max",
      "Size_sqft": "",
      "Bedrooms": "",
      ...
    }
    ```

---

### **Node 7: Save Updated Context**
- **Type**: Google Sheets append/update
- **Purpose**: Store conversation state
- **Data**: Phone, Location, Type, Budget, Size, Bedrooms, timestamp
- **Sheet**: `conversation_sessions`
- **Update logic**: Merge new extraction with prior row (if exists)

---

### **Node 8: Check if Ready to Search**
- **Type**: If node (conditional)
- **Purpose**: Verify all mandatory fields present
- **Condition**: `Location ✓ AND Type ✓ AND (Price_Lakh ✓ OR any)`
- **Branches**:
  - **True**: Proceed to inventory search
  - **False**: Ask for missing fields

---

### **Node 9: Download Entire Inventory**
- **Type**: Google Sheets read
- **Purpose**: Fetch all properties
- **Sheet**: `properties`
- **Columns**: property_id, location, type, price_lakh, size_sqft, bedrooms, description
- **Why**: No SQL; must filter in memory

---

### **Node 10: Apply Filters**
- **Type**: Code node (JavaScript)
- **Purpose**: Match properties to user criteria
- **Algorithm**:
  ```javascript
  properties.filter(p => {
    if (criteria.location && !p.location.includes(criteria.location)) return false;
    if (criteria.type && p.type !== criteria.type) return false;
    if (criteria.max_price && p.price > criteria.max_price) return false;
    if (criteria.min_price && p.price < criteria.min_price) return false;
    // ... size, bedrooms ...
    return true;
  });
  ```
- **Output**: Array of matching properties

---

### **Node 11: Were Any Properties Found?**
- **Type**: If node (conditional)
- **Purpose**: Branch on search results
- **Condition**: `matches.length > 0`
- **Branches**:
  - **True**: Format and send matches
  - **False**: Send "no properties available" message

---

### **Node 12: Format Properties**
- **Type**: Code node (JavaScript)
- **Purpose**: Convert property objects to WhatsApp text
- **Output**: 
  ```
  🏡 Here are matching properties:
  • Property ID: 123
  📍 Ahmedabad
  🏠 Flat
  💰 75 Lakh
  ...
  ```

---

### **Node 13: Send Property Matches**
- **Type**: n8n WhatsApp API
- **Purpose**: Send results back to user
- **Data**: Phone (from trigger), message body (from formatter)

---

### **Supporting Nodes**

| Node Name | Purpose | Details |
|-----------|---------|---------|
| **Clear Session** | Reset conversation state | Clears greeting session; sends menu |
| **Send Menu** | Initial welcome message | Displays available options |
| **Agent Handoff** | Escalation message | Provides contact details for human agent |
| **Keep Session** | Maintains partial state | Saves incomplete data; asks for missing fields |
| **Ask Missing Info** | Prompts user | "Please provide location and budget" |
| **Send No Match** | Empty results message | "No properties found with those criteria" |

---

## Data Storage Model

### Google Sheets: Schema Overview

#### Sheet 1: `properties` (Inventory)
| property_id | location | type | price_lakh | size_sqft | bedrooms | description |
|-------------|----------|------|------------|-----------|----------|-------------|
| 1 | ahmedabad | flat | 75 | 1200 | 2 | Spacious 2BHK in SG Highway |
| 2 | gota | villa | 150 | 2500 | 3 | Modern villa with garden |
| 3 | sg_highway | plot | 200 | 5000 | 0 | Commercial plot |

**Limitations**:
- ❌ No indexing → full table scan every search
- ❌ No relationships → duplication of data
- ❌ No transactions → potential race conditions
- ⚠️ Performance: OK for <500 properties, degrades beyond

---

#### Sheet 2: `conversation_sessions` (Session State)
| customer_phone | location | property_type | max_price | min_price | size_sqft | bedrooms | timestamp | status |
|----------------|----------|---------------|-----------|-----------|-----------|----------|-----------|--------|
| +919876543210 | ahmedabad | flat | 80 | 50 | 1000-1500 | 2-3 | 2026-07-07T14:30:00Z | active |

**Purpose**:
- Maintains conversation context across message turns
- Allows incremental input (user can say location in msg 1, budget in msg 2)
- Persists until user says "reset" or "hello"

---

## How It Works: Step by Step

### **Example Conversation Flow**

**User Message 1**: "Flat in Ahmedabad"
```
Flow:
1. Receive WhatsApp → Extract text
2. Not greeting, not agent request
3. LLM extracts: 
   {
     "reply": "Please share your budget.",
     "Location": "ahmedabad",
     "Type": "flat",
     "Price_Lakh": ""
   }
4. Check if ready → NO (missing budget)
5. Save to session sheet
6. Send: "Please share your preferred budget."
```

**User Message 2**: "Under 80 lakh"
```
Flow:
1. Receive WhatsApp → Extract text
2. LLM extracts:
   {
     "Price_Lakh": "80",
     "Price_Lakh_op": "max"
   }
3. Merge with prior session:
   {
     "Location": "ahmedabad",
     "Type": "flat",
     "Price_Lakh": "80",
     "Price_Lakh_op": "max"
   }
4. Check if ready → YES (all fields)
5. Download inventory
6. Apply filters:
   - location LIKE "ahmedabad" ✓
   - type = "flat" ✓
   - price <= 80 ✓
7. Results: [prop_1, prop_3, prop_5]
8. Format and send:
   "🏡 Here are 3 matching properties:
    • ID 1: Ahmedabad, Flat, 75L
    • ID 3: Ahmedabad, Flat, 78L
    • ID 5: Ahmedabad, Flat, 70L"
9. Clear session → ready for next search
```

---

## Limitations

### 🔴 **Critical Limitations**

| Issue | Impact | Workaround |
|-------|--------|-----------|
| **No database indexing** | Search time grows with inventory size | Limit to <500 properties |
| **Full table scan per query** | Slow filtering for large datasets | Manual query optimization |
| **No transaction support** | Concurrent writes corrupt data | Single writer at a time |
| **Memory constraints** | Loading huge inventories crashes n8n | Pre-filter before download |

### 🟡 **Operational Limitations**

| Issue | Impact | Note |
|-------|--------|------|
| **No audit trail** | Cannot track who modified what | Google Sheets revision history only |
| **Session fragility** | User data lost if sheet is deleted | No backup mechanism |
| **No API versioning** | Breaking changes affect all workflows | Manual updates required |
| **Limited concurrency** | Only one workflow execution at a time | n8n free tier limitation |

### ⚠️ **Scaling Limitations**

| Metric | Limit | Beyond This |
|--------|-------|------------|
| Properties in inventory | ~500 | Search becomes noticeably slow (>2s) |
| Active sessions | ~1000 | Sheet becomes unwieldy |
| Daily searches | ~1000 | n8n free tier quota exhausted |
| Concurrent users | 1 | Workflow waits for prior execution |

---

## Project Evolution

### **Timeline**

```
┌────────────────────────────────────────────────────────────────┐
│                        PROPERTY CRM                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Jun 2026                 Jul 2026              Aug 2026       │
│  ┌──────────────┐      ┌──────────────┐    ┌──────────────┐   │
│  │ Phase 1      │      │ Phase 2      │    │ Phase 3      │   │
│  │              │      │              │    │              │   │
│  │ n8n + Google │──→   │ n8n +        │──→ │ OpenClaw +   │   │
│  │ Sheets       │      │ PostgreSQL   │    │ BullMQ +     │   │
│  │              │      │              │    │ Redis +      │   │
│  │ Prototype    │      │ Scaled       │    │ Production   │   │
│  │ (This Doc)   │      │ Version      │    │ CRM          │   │
│  └──────────────┘      └──────────────┘    └──────────────┘   │
│         │                      │                    │          │
│    Validates          Improves performance    Final product   │
│    business logic     Demonstrates SQL        (Enterprise)    │
│    Proof of concept   approach                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### **What This Phase Taught Us**

✅ **Validated**:
- Users can describe requirements conversationally
- LLM extraction (Ollama) works for entity parsing
- WhatsApp API integration is reliable
- Session-based incremental search is UX-friendly

❌ **Discovered Issues**:
- Google Sheets is NOT suitable for production
- Full table scans are unacceptable at scale
- No transactional guarantees needed for phase 2
- Need for structured database (PostgreSQL)

🔄 **Influenced**:
- Property schema design (location, type, price, size, bedrooms)
- Conversation flow logic (greeting detection, agent escalation)
- Session persistence strategy
- Message formatting and WhatsApp integration patterns

---

## Deployment & Setup

### **Prerequisites**

- n8n instance (self-hosted or cloud)
- Ollama running locally or remote (with `llama3.1:8b`)
- Google Workspace account with Sheets API enabled
- Meta Developer account with WhatsApp Business API access

### **Setup Steps**

#### 1. **Google Sheets Preparation**

Create two sheets in a Google Spreadsheet:

**Sheet: `properties`**
```
Headers: property_id, location, type, price_lakh, size_sqft, bedrooms, description

Sample Data:
1, ahmedabad, flat, 75, 1200, 2, Spacious 2BHK
2, gota, villa, 150, 2500, 3, Modern villa with garden
3, sg_highway, plot, 200, 5000, 0, Commercial plot
```

**Sheet: `conversation_sessions`**
```
Headers: customer_phone, location, property_type, max_price, min_price, size_sqft, bedrooms, timestamp, status
(Leave empty initially; n8n will populate)
```

#### 2. **n8n Workflow Configuration**

1. Create new workflow in n8n
2. Import `property-search-google-sheets.json`
3. Configure credentials:
   - **Google Sheets**: Connect via OAuth
   - **WhatsApp**: Add API token and phone number
   - **Ollama**: Set endpoint (e.g., `http://localhost:11434`)

#### 3. **WhatsApp Webhook**

1. In Meta Developer Dashboard:
   - Set webhook URL: `https://[your-n8n-domain]/webhook/[workflow-id]`
   - Verify token: Use `n8n-webhook-validation-token`
2. Subscribe to `messages` event
3. Test with cURL:
   ```bash
   curl -X POST https://[your-n8n-url] \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"type": "text", "text": {"body": "test"}}]}'
   ```

#### 4. **Test the Workflow**

- Send WhatsApp message: "Hi"
- Expected response: Welcome menu
- Send: "Flat in Ahmedabad under 80 lakh"
- Expected response: Matching property list

---

### **Monitoring & Troubleshooting**

| Issue | Solution |
|-------|----------|
| **Duplicate messages** | Check workflow static data limit (max 200 IDs) |
| **LLM extraction fails** | Ensure Ollama is running; test with simple prompts |
| **Google Sheets permission error** | Re-authenticate; ensure service account has edit access |
| **WhatsApp message not received** | Verify webhook URL is publicly accessible; check Meta logs |

---

## Summary

This prototype successfully demonstrated the core Property Property CRM use case using low-code tools and AI. While not production-ready due to Google Sheets limitations, it served as the architectural blueprint for more scalable solutions.

**Key Takeaway**: This version proved that conversational property search is feasible and user-friendly, validating the business case for investment in a production-grade system.

---

**Document Version**: 1.0  
**Last Updated**: July 2026  
**Status**: Reference/Archived (See n8n-postgres for improved version)

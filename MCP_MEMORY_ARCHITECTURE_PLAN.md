# MCP-Based Multi-Call Discovery System - Implementation Plan

**Project:** Baton AI Discovery Call System with Rich Memory
**Goal:** Enable stateful, multi-call knowledge capture with semantic memory across 6 tiers
**Architecture:** MCP Memory Server + Smart Routing + Hume EVI + Vector Database

---

## EXECUTIVE SUMMARY

This system enables a voice AI to conduct 6 progressive discovery calls (5 minutes each) while maintaining perfect memory of all previous conversations. Each call builds on the last, with the AI able to recall specific stories, insights, and context from any previous interaction.

**Key Innovation:** Model Context Protocol (MCP) servers store rich semantic memory, allowing the AI to answer questions like "What did we discuss last time?" with specific, contextual responses.

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    CALL FLOW ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────┘

1. Caller dials Twilio number
   ↓
2. Twilio → Webhook: POST /voice (caller phone, CallSid)
   ↓
3. Smart Router Server:
   - Query MCP Memory Server: "Get history for +15551234567"
   - MCP returns: {current_tier: 2, call_history: [...], key_insights: [...]}
   ↓
4. Context Injection:
   - Load appropriate Tier prompt (Tier 2)
   - Inject memory context: "Last time we discussed X..."
   - Select Hume config for Tier 2
   ↓
5. Twilio connects to Hume EVI with memory-aware prompt
   ↓
6. Voice Conversation (5 min max)
   - Hume EVI conducts Tier 2 discovery questions
   - AI has context from previous calls
   ↓
7. Call Ends: Twilio → POST /call-status
   ↓
8. Post-Call Processing:
   - Retrieve call transcript from Hume
   - Extract key insights using LLM
   - Generate embeddings for semantic search
   - Save to MCP Memory Server:
     * Raw transcript
     * Extracted insights
     * Tier completion status
     * Vector embeddings
   ↓
9. Next Call: Automatically loads Tier 3 with full context

┌─────────────────────────────────────────────────────────────────┐
│                    COMPONENT DIAGRAM                             │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Twilio     │
                    │ Phone Number │
                    └──────┬───────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Smart Router Server │
                │  (Express + Node.js) │
                └──────────┬───────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐   ┌─────────────┐  ┌──────────────┐
    │   MCP    │   │   Hume EVI  │  │  PostgreSQL  │
    │  Memory  │   │  (6 Configs)│  │   Database   │
    │  Server  │   │             │  │              │
    └────┬─────┘   └─────────────┘  └──────────────┘
         │
         ▼
  ┌──────────────┐
  │   Vector DB  │
  │  (Pinecone)  │
  └──────────────┘
```

---

## COMPONENT BREAKDOWN

### 1. MCP MEMORY SERVER

**Purpose:** Centralized memory storage and retrieval using Model Context Protocol

**Technology Stack:**
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Storage:** PostgreSQL (structured data) + Pinecone (vector embeddings)
- **LLM:** OpenAI GPT-4 (for insight extraction and summarization)

**Data Schema:**

```javascript
// Caller Profile
{
  id: "uuid",
  phone_number: "+15551234567",
  name: "John Smith",
  business_name: "Smith Manufacturing",
  current_tier: 2,
  completed_tiers: [1],
  created_at: "2025-11-07T10:00:00Z",
  last_call_date: "2025-11-07T10:00:00Z"
}

// Call Record
{
  id: "uuid",
  caller_id: "uuid",
  tier: 1,
  call_sid: "CA1234567890",
  start_time: "2025-11-07T10:00:00Z",
  end_time: "2025-11-07T10:05:23Z",
  duration_seconds: 323,
  transcript: "Full conversation transcript...",
  summary: "Discussed three critical business risks...",
  key_insights: [
    {
      category: "critical_vendor",
      content: "Main supplier is ABC Corp, 20-year relationship with informal payment terms",
      importance: "high",
      embedding_id: "vec_123"
    },
    {
      category: "major_customer",
      content: "Customer X represents 40% of revenue, at risk of leaving",
      importance: "critical",
      embedding_id: "vec_124"
    }
  ],
  questions_asked: [
    "What are the 3-5 things that would put your business in danger?",
    "Tell me about your last 'oh shit' moment"
  ],
  questions_answered: [
    "What are the 3-5 things that would put your business in danger?"
  ],
  next_recommended_tier: 2,
  metadata: {
    emotional_tone: "cautious but engaged",
    engagement_level: "high",
    interruption_count: 2,
    ai_performance: "good"
  }
}

// Vector Embedding (stored in Pinecone)
{
  id: "vec_123",
  values: [0.123, 0.456, ...], // 1536-dim embedding
  metadata: {
    caller_id: "uuid",
    call_id: "uuid",
    tier: 1,
    content: "Main supplier is ABC Corp...",
    category: "critical_vendor",
    timestamp: "2025-11-07T10:02:15Z"
  }
}
```

**MCP Server Capabilities (Resources):**

```typescript
// MCP Resources the server exposes
resources: [
  {
    uri: "memory://caller/{phone_number}/history",
    name: "Call History",
    description: "Complete call history for a caller",
    mimeType: "application/json"
  },
  {
    uri: "memory://caller/{phone_number}/insights",
    name: "Key Insights",
    description: "Extracted insights from all calls",
    mimeType: "application/json"
  },
  {
    uri: "memory://caller/{phone_number}/progress",
    name: "Progress Tracking",
    description: "Current tier and completion status",
    mimeType: "application/json"
  },
  {
    uri: "memory://search/{query}",
    name: "Semantic Search",
    description: "Search across all conversations",
    mimeType: "application/json"
  }
]
```

**MCP Tools:**

```typescript
tools: [
  {
    name: "get_caller_context",
    description: "Get complete context for a caller",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: { type: "string" }
      }
    }
  },
  {
    name: "save_call_memory",
    description: "Save call transcript and insights",
    inputSchema: {
      type: "object",
      properties: {
        caller_id: { type: "string" },
        tier: { type: "number" },
        transcript: { type: "string" },
        insights: { type: "array" }
      }
    }
  },
  {
    name: "semantic_search",
    description: "Search memories semantically",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        caller_id: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_conversation_summary",
    description: "Get AI-generated summary of specific call",
    inputSchema: {
      type: "object",
      properties: {
        call_id: { type: "string" }
      }
    }
  }
]
```

---

### 2. SMART ROUTER SERVER

**Purpose:** Intercept Twilio webhooks, manage call state, route to appropriate Hume config

**Technology Stack:**
- **Framework:** Express.js (Node.js)
- **Database:** PostgreSQL (for caller state)
- **MCP Client:** Connects to MCP Memory Server
- **WebSocket:** For real-time Hume EVI communication (if needed)

**Key Endpoints:**

```javascript
// 1. Incoming Call Handler
POST /voice
Input: { From: "+15551234567", CallSid: "CA123...", ... }
Process:
  - Query MCP: get_caller_context(phone_number)
  - Determine current tier (1-6)
  - Load tier-specific prompt template
  - Inject memory context from previous calls
  - Generate TwiML to connect to Hume EVI
Output: TwiML XML

// 2. Call Status Handler
POST /call-status
Input: { CallSid: "CA123...", CallStatus: "completed", ... }
Process:
  - Retrieve call transcript from Hume API
  - Extract insights using GPT-4
  - Generate vector embeddings
  - Save to MCP: save_call_memory(...)
  - Update caller progress (tier completion)
Output: 200 OK

// 3. Memory Query (for debugging/dashboard)
GET /memory/:phone_number
Process:
  - Query MCP: get_caller_context(phone_number)
  - Return formatted JSON
Output: JSON with call history

// 4. Manual Context Injection (admin)
POST /inject-context
Input: { phone_number: "+15551234567", context: "..." }
Process:
  - Manually add context to caller's memory
Output: 200 OK
```

**Context Injection Logic:**

```javascript
async function buildContextAwarePrompt(callerPhone) {
  // Get memory from MCP
  const memory = await mcpClient.callTool('get_caller_context', {
    phone_number: callerPhone
  });

  const tier = memory.current_tier;
  const lastCallSummary = memory.call_history[memory.call_history.length - 1]?.summary;
  const topInsights = memory.key_insights.slice(0, 3);

  // Load base tier prompt
  const baseTierPrompt = await loadTierPrompt(tier);

  // Inject memory context
  const memoryContext = `
# CONVERSATION MEMORY

## Previous Calls Summary:
${memory.call_history.map(call =>
  `- Call ${call.tier} (${call.date}): ${call.summary}`
).join('\n')}

## Key Insights from Previous Calls:
${topInsights.map(insight => `- ${insight.content}`).join('\n')}

## Last Call Recap:
${lastCallSummary || 'This is the first call'}

## Today's Focus:
${getTierName(tier)}

## Opening Line:
${tier === 1
  ? "Hey, this is Baton AI. How you doin'? Thanks for taking the time to chat with us."
  : `Hey! Good to talk with you again. Last time we covered ${getTierName(tier - 1)}. ${lastCallSummary}. Today I'd love to dive into ${getTierName(tier)}. Sound good?`
}

---

${baseTierPrompt}
  `;

  return memoryContext;
}
```

---

### 3. HUME EVI CONFIGURATIONS (6 Tiers)

**Purpose:** Voice AI for each discovery tier with focused prompts

**Configuration Strategy:**

Create 6 separate Hume EVI configs, one per tier:

```javascript
// Tier 1: Business Survival Knowledge
{
  config_id: "tier1_abc123",
  name: "Baton AI - Tier 1: Business Survival",
  evi_version: "3",
  voice: { provider: "CUSTOM_VOICE", id: "5bd05afd..." }, // Ian voice
  prompt: {
    text: `${HUMAN_CENTERED_CONSTITUTION}

## TODAY'S FOCUS: TIER 1 - BUSINESS SURVIVAL KNOWLEDGE

Your goal: Capture critical "if I don't know this, the business fails" knowledge.

**Time Limit:** 5 minutes maximum

**Questions to Cover:**
1. "What are the 3-5 things that, if they went wrong tomorrow, would put this business in serious danger - and how would you fix them?"
2. "Walk me through your last three 'oh shit' moments - what went wrong, what did you do?"
3. "Which customers, suppliers, or relationships are absolutely critical to keep?"
4. "What are the 'silent killers' - small things that snowball into big problems?"

**Closing:**
"This has been really valuable. We've captured some critical insights about [mention 1-2 key points]. Next time we talk, I'd love to learn about how you make strategic decisions. Would you like to schedule our next call?"
`
  }
}

// Tier 2: Decision-Making Heuristics
{
  config_id: "tier2_def456",
  name: "Baton AI - Tier 2: Decision-Making",
  // ... similar structure but with Tier 2 questions
}

// ... Tiers 3-6 follow same pattern
```

**Dynamic Prompt Injection:**

Since Hume EVI configs are created ahead of time, we can't dynamically inject memory context directly into the Hume prompt. **Solution:**

**Option A:** Use Hume's `session_settings` or custom instructions (if supported)
**Option B:** Build custom WebSocket bridge that injects context in real-time
**Option C:** Use a hybrid: Create multiple configs per tier (e.g., Tier 1 First Call vs. Tier 1 Follow-up)

**Recommended: Option B (Custom WebSocket Bridge)**

```javascript
// Custom bridge between Twilio and Hume
app.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const connect = twiml.connect();

  // Connect to OUR WebSocket server (not directly to Hume)
  connect.stream({
    url: `wss://your-server.com/media-stream?caller=${req.body.From}`
  });

  res.type('text/xml').send(twiml.toString());
});

// WebSocket handler
wss.on('connection', async (twilioWs, req) => {
  const callerPhone = new URL(req.url, 'wss://base').searchParams.get('caller');

  // Get memory context
  const context = await buildContextAwarePrompt(callerPhone);

  // Connect to Hume EVI
  const humeSocket = hume.empathicVoice.chat.connect({
    apiKey: process.env.HUME_API_KEY,
    configId: getTierConfigId(memory.current_tier),
    // Inject custom context (if Hume supports it)
    customInstructions: context
  });

  // Bridge audio between Twilio and Hume
  twilioWs.on('message', (msg) => {
    if (msg.event === 'media') {
      humeSocket.sendAudioInput({ data: msg.media.payload });
    }
  });

  humeSocket.on('message', (msg) => {
    if (msg.type === 'audio_output') {
      twilioWs.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: { payload: msg.data }
      }));
    }
  });
});
```

---

### 4. VECTOR DATABASE (Pinecone)

**Purpose:** Enable semantic search across all conversation memories

**Why Pinecone:**
- Fast semantic search
- Handles 1536-dim OpenAI embeddings
- Metadata filtering (by caller, tier, date)
- Free tier available

**Schema:**

```javascript
// Index: "baton-discovery-memories"
// Dimension: 1536 (OpenAI text-embedding-3-small)

{
  id: "mem_abc123",
  values: [0.123, 0.456, ...], // embedding vector
  metadata: {
    caller_id: "uuid",
    caller_phone: "+15551234567",
    call_id: "uuid",
    tier: 1,
    category: "critical_vendor",
    content: "Main supplier is ABC Corp, 20-year informal payment arrangement",
    timestamp: "2025-11-07T10:02:15Z",
    importance: "high"
  }
}
```

**Usage Examples:**

```javascript
// Search: "What did the caller say about suppliers?"
const query = "suppliers vendors critical relationships";
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: query
});

const results = await pinecone.index('baton-discovery-memories').query({
  vector: embedding.data[0].embedding,
  topK: 5,
  filter: {
    caller_phone: "+15551234567"
  },
  includeMetadata: true
});

// Returns:
// [
//   { score: 0.92, metadata: { content: "Main supplier is ABC Corp..." } },
//   { score: 0.87, metadata: { content: "Backup vendor for critical parts..." } }
// ]
```

---

### 5. POSTGRESQL DATABASE

**Purpose:** Store structured call data, caller profiles, progress tracking

**Schema:**

```sql
-- Callers Table
CREATE TABLE callers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  business_name VARCHAR(255),
  current_tier INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  last_call_at TIMESTAMP,
  INDEX idx_phone (phone_number)
);

-- Calls Table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID REFERENCES callers(id),
  tier INTEGER NOT NULL,
  call_sid VARCHAR(100) UNIQUE,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  transcript TEXT,
  summary TEXT,
  next_recommended_tier INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_caller (caller_id),
  INDEX idx_tier (tier),
  INDEX idx_call_sid (call_sid)
);

-- Insights Table
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id),
  caller_id UUID REFERENCES callers(id),
  category VARCHAR(100),
  content TEXT,
  importance VARCHAR(20),
  tier INTEGER,
  embedding_id VARCHAR(100), -- Pinecone vector ID
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_call (call_id),
  INDEX idx_caller (caller_id),
  INDEX idx_category (category)
);

-- Tier Progress Table
CREATE TABLE tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID REFERENCES callers(id),
  tier INTEGER NOT NULL,
  status VARCHAR(20), -- 'not_started', 'in_progress', 'completed'
  questions_asked JSONB,
  questions_answered JSONB,
  completion_percentage INTEGER,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(caller_id, tier),
  INDEX idx_caller_tier (caller_id, tier)
);
```

---

## IMPLEMENTATION PHASES

### PHASE 1: Foundation (Week 1)

**Goal:** Basic routing with simple memory storage

**Tasks:**
1. ✅ Set up PostgreSQL database
2. ✅ Create database schema (callers, calls, insights tables)
3. ✅ Build Smart Router server (Express.js)
4. ✅ Implement `/voice` webhook (basic routing)
5. ✅ Implement `/call-status` webhook (call logging)
6. ✅ Create Tier 1 Hume EVI configuration
7. ✅ Test: Single call to Tier 1, verify data saved

**Deliverables:**
- Working server that routes calls to Tier 1
- Database storing caller info and call records
- Basic call logging (no memory yet)

**Success Criteria:**
- Can make a call and get connected to Tier 1 AI
- Call data saved to database

---

### PHASE 2: MCP Memory Server (Week 2)

**Goal:** Build MCP server for memory storage and retrieval

**Tasks:**
1. ✅ Install MCP SDK: `@modelcontextprotocol/sdk`
2. ✅ Create MCP server structure
3. ✅ Implement MCP resources (history, insights, progress)
4. ✅ Implement MCP tools (get_caller_context, save_call_memory)
5. ✅ Connect Smart Router to MCP server
6. ✅ Test: Query caller history via MCP
7. ✅ Implement transcript storage

**Deliverables:**
- Working MCP server
- Smart Router querying MCP for context
- Call transcripts saved to database

**Success Criteria:**
- Can query "get_caller_context" and receive call history
- Second call shows awareness of first call

---

### PHASE 3: Vector Memory (Week 3)

**Goal:** Add semantic search with Pinecone

**Tasks:**
1. ✅ Set up Pinecone account and index
2. ✅ Install Pinecone SDK
3. ✅ Implement embedding generation (OpenAI)
4. ✅ Store embeddings in Pinecone on call completion
5. ✅ Implement semantic search tool in MCP
6. ✅ Test: Search "What did they say about suppliers?"
7. ✅ Integrate search results into context injection

**Deliverables:**
- Embeddings generated for all insights
- Semantic search working
- AI can answer "What did we discuss last time?"

**Success Criteria:**
- Semantic search returns relevant past conversations
- Context injection includes semantically relevant memories

---

### PHASE 4: Multi-Tier System (Week 4)

**Goal:** Create all 6 tier configs and progression logic

**Tasks:**
1. ✅ Create 6 tier-specific prompts
2. ✅ Create 6 Hume EVI configurations
3. ✅ Implement tier progression logic
4. ✅ Implement tier completion detection
5. ✅ Build tier-specific context injection
6. ✅ Test: Complete progression through all 6 tiers
7. ✅ Implement 5-minute timeout per call

**Deliverables:**
- 6 working Hume configs
- Auto-progression to next tier after call completion
- Memory context includes previous tier summaries

**Success Criteria:**
- Can complete all 6 tiers in sequence
- Each call references previous tier content
- 5-minute limit enforced

---

### PHASE 5: Insight Extraction (Week 5)

**Goal:** Automatically extract structured insights from transcripts

**Tasks:**
1. ✅ Design insight extraction prompt for GPT-4
2. ✅ Implement post-call processing pipeline
3. ✅ Extract insights by category (vendors, risks, etc.)
4. ✅ Rate insight importance (critical, high, medium)
5. ✅ Store structured insights in database
6. ✅ Update context injection to use structured insights
7. ✅ Test: Verify insights extracted accurately

**Deliverables:**
- Automated insight extraction after each call
- Structured insights saved to database
- Context injection uses key insights

**Success Criteria:**
- Insights extracted with >80% accuracy
- AI references specific insights in follow-up calls

---

### PHASE 6: Polish & Dashboard (Week 6)

**Goal:** Admin dashboard and production readiness

**Tasks:**
1. ✅ Build admin dashboard (view caller progress)
2. ✅ Implement manual context injection (admin feature)
3. ✅ Add call recording storage (Twilio recording)
4. ✅ Implement error handling and logging
5. ✅ Add monitoring (call success rate, AI performance)
6. ✅ Security audit (API keys, database access)
7. ✅ Performance optimization
8. ✅ Deploy to production (Heroku, AWS, or Railway)

**Deliverables:**
- Admin dashboard showing all callers and progress
- Production-ready deployment
- Monitoring and error alerts

**Success Criteria:**
- Dashboard shows real-time call data
- System handles 10+ concurrent calls
- <1% error rate

---

## DETAILED IMPLEMENTATION GUIDE

### Step 1: PostgreSQL Setup

**Install PostgreSQL:**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Or use Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
```

**Create Database:**
```bash
createdb baton_discovery
```

**Install Node.js PostgreSQL client:**
```bash
npm install pg
```

**Create Schema:**
```javascript
// db/schema.sql
-- Copy the SQL schema from section 5 above
```

**Initialize Database:**
```bash
psql baton_discovery < db/schema.sql
```

---

### Step 2: Smart Router Server

**Install Dependencies:**
```bash
npm install express twilio dotenv pg @modelcontextprotocol/sdk openai
```

**Create Server:**
```javascript
// server-smart-router.js
const express = require('express');
const twilio = require('twilio');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Incoming call handler
app.post('/voice', async (req, res) => {
  const callerPhone = req.body.From;

  try {
    // Get or create caller
    let caller = await getOrCreateCaller(callerPhone);

    // Get current tier
    const currentTier = caller.current_tier;

    // TODO: Query MCP for context (Phase 2)
    // const context = await mcpClient.callTool('get_caller_context', { phone_number: callerPhone });

    // Get Hume config for current tier
    const humeConfigId = getTierConfigId(currentTier);

    // Generate TwiML
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.pause({ length: 3 }); // 3 rings

    // Connect to Hume EVI
    // Note: This is simplified - you may need WebSocket bridge for context injection
    const connect = twiml.connect();
    connect.stream({
      url: `https://api.hume.ai/v0/evi/twilio?config_id=${humeConfigId}&api_key=${process.env.HUME_API_KEY}`
    });

    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('Error handling call:', error);
    res.status(500).send('Error processing call');
  }
});

// Call status handler
app.post('/call-status', async (req, res) => {
  const { CallSid, CallStatus, From, Duration } = req.body;

  if (CallStatus === 'completed') {
    try {
      // Get caller
      const caller = await getCallerByPhone(From);

      // TODO: Retrieve transcript from Hume (Phase 2)
      // TODO: Extract insights with GPT-4 (Phase 5)
      // TODO: Generate embeddings (Phase 3)
      // TODO: Save to MCP (Phase 2)

      // Save call record
      await pool.query(`
        INSERT INTO calls (caller_id, tier, call_sid, duration_seconds)
        VALUES ($1, $2, $3, $4)
      `, [caller.id, caller.current_tier, CallSid, Duration]);

      // Update caller progress
      await pool.query(`
        UPDATE callers
        SET last_call_at = NOW(),
            current_tier = current_tier + 1
        WHERE id = $1
      `, [caller.id]);

    } catch (error) {
      console.error('Error saving call data:', error);
    }
  }

  res.sendStatus(200);
});

// Helper functions
async function getOrCreateCaller(phoneNumber) {
  const result = await pool.query(
    'SELECT * FROM callers WHERE phone_number = $1',
    [phoneNumber]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Create new caller
  const insertResult = await pool.query(`
    INSERT INTO callers (phone_number, current_tier)
    VALUES ($1, 1)
    RETURNING *
  `, [phoneNumber]);

  return insertResult.rows[0];
}

async function getCallerByPhone(phoneNumber) {
  const result = await pool.query(
    'SELECT * FROM callers WHERE phone_number = $1',
    [phoneNumber]
  );
  return result.rows[0];
}

function getTierConfigId(tier) {
  const configIds = {
    1: process.env.HUME_TIER1_CONFIG_ID,
    2: process.env.HUME_TIER2_CONFIG_ID,
    3: process.env.HUME_TIER3_CONFIG_ID,
    4: process.env.HUME_TIER4_CONFIG_ID,
    5: process.env.HUME_TIER5_CONFIG_ID,
    6: process.env.HUME_TIER6_CONFIG_ID,
  };
  return configIds[tier] || configIds[1];
}

// Start server
app.listen(port, () => {
  console.log(`Smart Router server running on port ${port}`);
});
```

---

### Step 3: MCP Memory Server

**Create MCP Server:**
```javascript
// mcp-server/memory-server.js
const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');
const { Pool } = require('pg');

class MemoryMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'baton-memory-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    this.setupHandlers();
  }

  setupHandlers() {
    // Resource handler: Get call history
    this.server.setRequestHandler('resources/list', async () => {
      return {
        resources: [
          {
            uri: 'memory://caller/history',
            name: 'Call History',
            mimeType: 'application/json',
          },
          {
            uri: 'memory://caller/insights',
            name: 'Key Insights',
            mimeType: 'application/json',
          }
        ]
      };
    });

    // Tool handler: Get caller context
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_caller_context':
          return await this.getCallerContext(args.phone_number);

        case 'save_call_memory':
          return await this.saveCallMemory(args);

        case 'semantic_search':
          return await this.semanticSearch(args.query, args.caller_id);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async getCallerContext(phoneNumber) {
    // Get caller
    const callerResult = await this.pool.query(
      'SELECT * FROM callers WHERE phone_number = $1',
      [phoneNumber]
    );

    if (callerResult.rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ first_call: true }) }]
      };
    }

    const caller = callerResult.rows[0];

    // Get call history
    const callsResult = await this.pool.query(`
      SELECT * FROM calls
      WHERE caller_id = $1
      ORDER BY start_time DESC
    `, [caller.id]);

    // Get insights
    const insightsResult = await this.pool.query(`
      SELECT * FROM insights
      WHERE caller_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [caller.id]);

    const context = {
      caller_id: caller.id,
      phone_number: caller.phone_number,
      current_tier: caller.current_tier,
      completed_tiers: callsResult.rows.map(c => c.tier),
      call_history: callsResult.rows.map(call => ({
        tier: call.tier,
        date: call.start_time,
        duration: call.duration_seconds,
        summary: call.summary
      })),
      key_insights: insightsResult.rows.map(insight => ({
        category: insight.category,
        content: insight.content,
        importance: insight.importance
      }))
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(context, null, 2)
        }
      ]
    };
  }

  async saveCallMemory(args) {
    // Implementation in Phase 2
    return { content: [{ type: 'text', text: 'Saved successfully' }] };
  }

  async semanticSearch(query, callerId) {
    // Implementation in Phase 3 with Pinecone
    return { content: [{ type: 'text', text: 'Search results...' }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Baton Memory MCP Server running on stdio');
  }
}

// Start server
const server = new MemoryMCPServer();
server.run().catch(console.error);
```

---

### Step 4: Create Tier Prompts

**Tier 1 Prompt:**
```markdown
# HUMAN-CENTERED DISCOVERY CALL - TIER 1

## CORE IDENTITY
You are a human-centered voice AI for Baton AI conducting the first of six discovery calls to help preserve a business owner's life's work.

## COMMUNICATION STYLE
- Warm, respectful, humble, collaborative
- Keep responses under 40 words
- Read emotional cues constantly
- NEVER use pressure tactics

## TODAY'S FOCUS: TIER 1 - BUSINESS SURVIVAL KNOWLEDGE (5 MINUTES MAX)

Your goal: Capture critical "if I don't know this, the business fails" knowledge.

## OPENING
"Hey, this is Baton AI. How you doin'? Thanks for taking time to chat. Today I want to understand the critical things that keep your business running. This should take about 5 minutes. Sound good?"

## QUESTIONS TO COVER (Use story-elicitation, not interrogation)

### 1. Critical Vulnerabilities
"What are the 3-5 things that, if they went wrong tomorrow, would put your business in serious danger - and how would you fix them?"

### 2. Crisis Moments
"Walk me through your last few 'oh shit' moments - what went wrong, what did you do, and what would you do differently now?"

### 3. Critical Relationships
"Which customers, suppliers, or relationships are absolutely critical to keep - and what's the unwritten agreement or history with each that I need to know?"

### 4. Silent Killers
"What are the 'silent killers' - small things people ignore that snowball into big problems?"

## EMOTIONAL SAFETY
- If hesitation: "I'm sensing some hesitation - what would help clarify this?"
- If discomfort: STOP. "This might not be the right time - that's completely okay."
- Check comfort every 5 minutes

## CLOSING (After 5 minutes)
"This has been really valuable. We've captured some critical insights about [mention 1-2 key points]. Next time we talk, I'd love to learn about how you make strategic decisions. Would you like to schedule our next call in a few days?"

## SUCCESS METRICS
- Caller feels heard and in control
- At least 2-3 critical vulnerabilities captured
- Caller wants to continue conversation
```

**Repeat similar structure for Tiers 2-6** (each focused on their respective questions)

---

### Step 5: Create 6 Hume Configs

**Script to create all configs:**
```javascript
// create-hume-configs.js
require('dotenv').config();
const { HumeClient } = require('hume');
const fs = require('fs');

async function createTierConfigs() {
  const hume = new HumeClient({ apiKey: process.env.HUME_API_KEY });

  const tiers = [
    { tier: 1, name: 'Business Survival', file: './prompts/tier1.txt' },
    { tier: 2, name: 'Decision-Making', file: './prompts/tier2.txt' },
    { tier: 3, name: 'Operational Wisdom', file: './prompts/tier3.txt' },
    { tier: 4, name: 'Network Knowledge', file: './prompts/tier4.txt' },
    { tier: 5, name: 'Cultural Knowledge', file: './prompts/tier5.txt' },
    { tier: 6, name: 'Future Strategy', file: './prompts/tier6.txt' },
  ];

  for (const tierInfo of tiers) {
    const prompt = fs.readFileSync(tierInfo.file, 'utf8');

    const config = await hume.empathicVoice.configs.createConfig({
      eviVersion: '3',
      name: `Baton AI - Tier ${tierInfo.tier}: ${tierInfo.name}`,
      prompt: { text: prompt },
      voice: {
        provider: 'CUSTOM_VOICE',
        id: '5bd05afd-db0f-42c0-950e-be2f6e8ba39c' // Ian voice
      }
    });

    console.log(`✅ Created Tier ${tierInfo.tier}: ${config.id}`);
    console.log(`   Add to .env: HUME_TIER${tierInfo.tier}_CONFIG_ID=${config.id}\n`);
  }
}

createTierConfigs().catch(console.error);
```

---

## DATA FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────┐
│                  DETAILED CALL FLOW                          │
└──────────────────────────────────────────────────────────────┘

Step 1: Incoming Call
  Caller dials +1-XXX-XXX-XXXX
  ↓
  Twilio receives call
  ↓
  POST to https://your-server.com/voice
  Body: { From: "+15551234567", CallSid: "CA123...", ... }

Step 2: Context Retrieval
  Smart Router queries MCP Memory Server
  ↓
  MCP executes: get_caller_context("+15551234567")
  ↓
  PostgreSQL query:
    SELECT * FROM callers WHERE phone_number = '+15551234567'
    SELECT * FROM calls WHERE caller_id = 'uuid' ORDER BY start_time DESC
    SELECT * FROM insights WHERE caller_id = 'uuid' LIMIT 10
  ↓
  Returns: {
    current_tier: 2,
    completed_tiers: [1],
    call_history: [{ tier: 1, summary: "Discussed...", date: "..." }],
    key_insights: [{ content: "Main vendor is ABC Corp", ... }]
  }

Step 3: Context Injection
  Load Tier 2 base prompt from file
  ↓
  Inject memory context:
    - Previous call summary
    - Key insights from Tier 1
    - Opening line referencing last call
  ↓
  Final prompt = Base Tier 2 Prompt + Memory Context

Step 4: Route to Hume
  Get Hume Config ID for Tier 2 from env
  ↓
  Generate TwiML:
    <Response>
      <Pause length="3"/>
      <Connect>
        <Stream url="wss://your-server.com/media?caller=+1555..."/>
      </Connect>
    </Response>
  ↓
  OR (simpler, no WebSocket bridge):
    <Response>
      <Pause length="3"/>
      <Connect>
        <Stream url="https://api.hume.ai/v0/evi/twilio?config_id=tier2_xxx&api_key=xxx"/>
      </Connect>
    </Response>

Step 5: Voice Conversation (5 min)
  Hume EVI conducts Tier 2 questions
  ↓
  Caller responds with stories and insights
  ↓
  Hume captures conversation transcript internally

Step 6: Call Ends
  Twilio sends POST to https://your-server.com/call-status
  Body: { CallSid: "CA123...", CallStatus: "completed", Duration: "323", ... }

Step 7: Post-Call Processing

  7a. Retrieve Transcript
    Query Hume API: GET /v0/evi/chats/{chat_id}/messages
    ↓
    Extract full conversation transcript

  7b. Extract Insights (GPT-4)
    Send to OpenAI:
      Prompt: "Extract key business insights from this transcript..."
      Transcript: [full conversation]
    ↓
    Returns: [
      { category: "critical_decision", content: "...", importance: "high" },
      { category: "vendor_relationship", content: "...", importance: "medium" }
    ]

  7c. Generate Embeddings
    For each insight:
      embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: insight.content
      })
    ↓
    Returns: [0.123, 0.456, ...] (1536-dim vector)

  7d. Save to Vector DB (Pinecone)
    await pinecone.index('baton-memories').upsert([{
      id: "mem_abc123",
      values: embedding,
      metadata: {
        caller_id: "uuid",
        tier: 2,
        content: insight.content,
        category: insight.category
      }
    }])

  7e. Save to PostgreSQL
    INSERT INTO calls (caller_id, tier, transcript, summary, ...)
    INSERT INTO insights (call_id, category, content, importance, ...)

  7f. Update Progress
    UPDATE callers SET current_tier = 3, last_call_at = NOW()
    UPDATE tier_progress SET status = 'completed'

Step 8: Next Call
  When caller calls again:
    ↓
    Context retrieval shows: current_tier = 3, completed_tiers = [1, 2]
    ↓
    AI opens with: "Hey! Great to talk again. Last time we covered how you make decisions. Today let's dive into operational wisdom..."
```

---

## TESTING PLAN

### Phase 1 Tests

**Test 1.1: Database Connection**
```bash
node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows[0]); pool.end(); });"
```
Expected: Current timestamp

**Test 1.2: First Call**
- Call Twilio number
- Verify: Connected to Tier 1 AI
- Verify: Can have conversation
- Verify: Caller record created in database

**Test 1.3: Call Logging**
- Complete call
- Check database: `SELECT * FROM calls ORDER BY created_at DESC LIMIT 1`
- Verify: Call record exists with duration

---

### Phase 2 Tests

**Test 2.1: MCP Server**
```bash
node mcp-server/memory-server.js
# In another terminal:
echo '{"method": "tools/call", "params": {"name": "get_caller_context", "arguments": {"phone_number": "+15551234567"}}}' | node mcp-server/memory-server.js
```
Expected: JSON with caller context

**Test 2.2: Second Call with Memory**
- Make second call with same number
- Verify: AI references first call
- Verify: current_tier incremented to 2

---

### Phase 3 Tests

**Test 3.1: Embedding Generation**
```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI();

const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "Main supplier is ABC Corp"
});

console.log(embedding.data[0].embedding.length); // Should be 1536
```

**Test 3.2: Semantic Search**
```javascript
// Search for "suppliers"
const results = await pinecone.query({
  vector: queryEmbedding,
  topK: 3
});

console.log(results); // Should return relevant supplier mentions
```

---

### Phase 4 Tests

**Test 4.1: Multi-Tier Progression**
- Complete Tier 1 call
- Immediately call again → Verify routed to Tier 2
- Complete Tier 2 call
- Immediately call again → Verify routed to Tier 3
- Continue through all 6 tiers

**Test 4.2: 5-Minute Timeout**
- Start call
- Talk for >5 minutes
- Verify: AI wraps up conversation and suggests follow-up

---

### End-to-End Test

**Complete Discovery Journey:**
1. New caller makes first call
2. Completes Tier 1 (Business Survival)
3. Waits 2 days
4. Calls back → Tier 2 (Decision-Making)
5. AI references specific story from Tier 1
6. Caller asks: "What did we talk about last time?"
7. AI provides accurate summary
8. Complete all 6 tiers over 2-3 weeks
9. Review dashboard showing full journey

---

## DEPLOYMENT CHECKLIST

### Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/baton_discovery
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
HUME_API_KEY=xxxxx
HUME_TIER1_CONFIG_ID=xxxxx
HUME_TIER2_CONFIG_ID=xxxxx
HUME_TIER3_CONFIG_ID=xxxxx
HUME_TIER4_CONFIG_ID=xxxxx
HUME_TIER5_CONFIG_ID=xxxxx
HUME_TIER6_CONFIG_ID=xxxxx
OPENAI_API_KEY=sk-xxxxx
PINECONE_API_KEY=xxxxx
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=baton-memories
PORT=3000
```

### Production Deployment (Railway)

**Option A: Railway (Recommended - Easiest)**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add PostgreSQL
railway add postgresql

# Deploy
railway up

# Get URL
railway domain
```

**Option B: Heroku**

```bash
# Install Heroku CLI
brew install heroku

# Create app
heroku create baton-discovery

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Deploy
git push heroku main

# Set env vars
heroku config:set HUME_API_KEY=xxxxx
```

**Option C: AWS (Most Control)**
- EC2 instance with Node.js
- RDS PostgreSQL
- Route53 for domain
- CloudWatch for monitoring

---

## MONITORING & OBSERVABILITY

### Key Metrics to Track

**Call Metrics:**
- Total calls per day
- Average call duration
- Call completion rate (did they finish or hang up?)
- Tier progression rate (% reaching Tier 6)

**Memory Metrics:**
- Average insights extracted per call
- Semantic search accuracy
- Context relevance score (user feedback)

**System Metrics:**
- API response time (Hume, OpenAI, Pinecone)
- Database query performance
- Error rate
- Webhook delivery success

### Logging Strategy

```javascript
// Use structured logging
const logger = require('pino')();

logger.info({
  event: 'call_started',
  caller: '+15551234567',
  tier: 2,
  callSid: 'CA123',
  timestamp: new Date()
});

logger.error({
  event: 'error',
  error: error.message,
  stack: error.stack,
  context: { caller, tier }
});
```

### Error Alerting

Use a service like:
- **Sentry** (error tracking)
- **PagerDuty** (on-call alerts)
- **Better Uptime** (uptime monitoring)

---

## COST ESTIMATION

### Monthly Costs (100 calls/month)

**Hume EVI:**
- 100 calls × 5 min = 500 minutes
- ~$0.06/min = **$30/month**

**OpenAI:**
- Embedding generation: 100 calls × 1000 tokens = **$0.02/month**
- GPT-4 insight extraction: 100 calls × 2000 tokens = **$0.20/month**

**Pinecone:**
- Free tier: 1 index, 100K vectors = **$0/month** (initially)

**PostgreSQL (Heroku):**
- Mini plan = **$5/month**

**Hosting (Railway):**
- Starter plan = **$5/month**

**Total: ~$40/month** for 100 calls (grows with usage)

---

## SECURITY CONSIDERATIONS

**1. API Key Protection**
- Store in environment variables, never in code
- Use Railway/Heroku secrets management
- Rotate keys quarterly

**2. Database Security**
- Use SSL connections (required by Heroku/Railway)
- Limit database access to app server IP only
- Regular backups (automated on Heroku/Railway)

**3. PII Protection**
- Encrypt phone numbers at rest
- Comply with GDPR/CCPA (if applicable)
- Add data deletion endpoint for user requests

**4. Webhook Security**
- Validate Twilio signatures on webhooks
- Use HTTPS only (Let's Encrypt)
- Rate limiting on endpoints

---

## FUTURE ENHANCEMENTS

**Phase 7: Advanced Features**

1. **Proactive Follow-ups**
   - Automated scheduling: "I'll call you back next Tuesday at 2pm"
   - SMS reminders before calls

2. **Multi-Language Support**
   - Detect caller language
   - Use multilingual Hume voices

3. **Real-Time Dashboard**
   - Live call monitoring
   - Real-time transcription display
   - Admin can "jump in" to assist

4. **AI-Powered Insights**
   - Automatically generate succession plan recommendations
   - Risk assessment scoring
   - Business valuation estimates

5. **Integration with CRM**
   - Sync data to Salesforce/HubSpot
   - Automated lead scoring

6. **Voice Cloning for Business Owner**
   - Clone the owner's voice for training materials
   - Preserve their voice for legacy

---

## SUCCESS CRITERIA

### Week 1 (Phase 1):
- ✅ Can receive call and route to Tier 1
- ✅ Call data saved to database
- ✅ No crashes or errors

### Week 2 (Phase 2):
- ✅ MCP server operational
- ✅ Second call shows memory of first call
- ✅ Call transcripts stored

### Week 3 (Phase 3):
- ✅ Semantic search returns relevant results
- ✅ Context injection includes past insights

### Week 4 (Phase 4):
- ✅ All 6 tiers operational
- ✅ Auto-progression through tiers
- ✅ 5-minute timeout enforced

### Week 5 (Phase 5):
- ✅ Insights extracted with 80%+ accuracy
- ✅ AI references specific past conversations

### Week 6 (Phase 6):
- ✅ Admin dashboard showing all callers
- ✅ Production deployment live
- ✅ <1% error rate

---

## FINAL DELIVERABLES

After 6 weeks, you will have:

1. **Fully Functional System**
   - 6-tier progressive discovery calls
   - Rich semantic memory
   - MCP-based context management

2. **Codebase**
   - Smart Router server
   - MCP Memory server
   - Database schema
   - 6 tier prompts
   - Deployment scripts

3. **Documentation**
   - Architecture docs
   - API documentation
   - Deployment guide
   - User manual

4. **Admin Dashboard**
   - View all callers
   - See progress through tiers
   - Review call transcripts
   - Manual context injection

5. **Production Deployment**
   - Live on Railway/Heroku
   - PostgreSQL database
   - Pinecone vector DB
   - Monitoring and alerts

---

## QUESTIONS TO ANSWER BEFORE STARTING

1. **Database Hosting:**
   - Do you have a preference: Heroku, Railway, AWS, or local development first?

2. **Deployment Timeline:**
   - Is 6 weeks realistic for your timeline? Need it faster?

3. **Budget:**
   - Are you comfortable with ~$40-50/month costs initially?

4. **MCP Complexity:**
   - Start with simple JSON memory (faster) or build full MCP from day 1?

5. **Admin Dashboard:**
   - How important is the dashboard in Phase 1? Can it wait until Phase 6?

---

## NEXT STEPS

**Option 1: Start with Phase 1 (Foundation)**
- I'll build the Smart Router server
- Set up PostgreSQL database
- Create Tier 1 Hume config
- Test: Single call works

**Option 2: Full Build-Out**
- Execute all 6 phases sequentially
- Build complete system end-to-end
- Takes ~6 weeks

**Option 3: MVP Simplified**
- Skip MCP, use simple JSON memory
- Only build Tier 1-2 (not all 6)
- Get working in 1-2 weeks
- Add MCP later

**Which approach would you like to take?**

---

**END OF PLAN**

Total Pages: 19
Word Count: ~8,500 words
Implementation Time: 6 weeks (with 1 developer)
Complexity: High (but broken into manageable phases)

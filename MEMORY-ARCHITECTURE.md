# Vapi Memory Architecture Documentation

## Overview

This system implements **persistent conversation memory** for the Baton AI voice assistant using Vapi.ai. When a caller phones the Baton AI number multiple times, the AI remembers previous conversations and can reference specific details shared across calls.

---

## User Experience Design

### First-Time Caller Experience

**Phone rings → AI answers:**
> "Hey, this is Baton AI. How you doin'? We help business owners like you preserve what you've built. This is a relaxed conversation - we can take as long as you need, or break it into multiple calls. Is now a good time?"

- **Intent**: Establish trust, set expectations for a conversational (not transactional) experience
- **Key UX principle**: Caller has full control - can end anytime, resume later
- **AI behavior**: Runs through the 6-Tier Discovery Framework, asking story-based questions about their business

### Returning Caller Experience

**Phone rings → AI answers:**
> "Hey! Good to hear from you again. Let's pick up where we left off."

- **Intent**: Acknowledge familiarity, demonstrate memory, resume context
- **Key UX principle**: Seamless continuation across multiple calls
- **AI behavior**: Has access to last 3 calls of conversation history, can reference specific details:
  - Business facts shared ("you mentioned your bakery")
  - Problems discussed ("last time you talked about that supplier issue")
  - Progress in the discovery process ("we covered Tier 1 last time")

### Memory Expectations

**What the AI WILL remember:**
- ✅ Business type and key details
- ✅ Specific problems or challenges discussed
- ✅ Names of key people, customers, suppliers
- ✅ Strategic insights shared (proprietary methods, competitive advantages)
- ✅ Progress through the 6-Tier Discovery Framework
- ✅ Tone/context of previous conversations (e.g., if caller was frustrated)

**What the AI will NOT remember:**
- ❌ Conversations from more than 3 calls ago (older history is archived but not actively used)
- ❌ Information from calls by other phone numbers (memory is per-phone-number)

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vapi.ai Platform                         │
│  - Handles voice calls to +1 (407) 436-6284                    │
│  - Manages speech-to-text, text-to-speech, LLM orchestration   │
│  - Sends webhooks to local server                               │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Webhooks via ngrok tunnel
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Local Node.js Server (Port 3000)                    │
│  File: server-vapi-memory.js                                    │
│                                                                   │
│  Endpoints:                                                      │
│  • POST /webhook/assistant-request (call starts)                │
│  • POST /webhook/end-of-call-report (call ends)                 │
│  • POST /webhook/transcript (real-time updates)                 │
│  • GET /memory/:phone (view customer history)                   │
│  • DELETE /memory (clear all memory)                            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Reads/writes
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    vapi-memory.json                              │
│  Persistent storage of conversation history indexed by phone #   │
└─────────────────────────────────────────────────────────────────┘
```

### Ngrok Tunnel

The local server is exposed via ngrok to receive webhooks from Vapi:
- **Ngrok URL**: `https://sprier-sulfurously-wendy.ngrok-free.dev`
- **Local server**: `http://localhost:3000`
- **Purpose**: Allows Vapi's cloud service to send webhooks to local development server

---

## Call Flow: How Memory Works

### Phase 1: Incoming Call (assistant-request webhook)

```
1. Caller dials +1 (407) 436-6284
2. Vapi receives call, sees phone number has NO assistantId assigned
3. Vapi sends webhook: POST /webhook/assistant-request
   Payload includes:
   {
     "message": {
       "type": "assistant-request",
       "call": {
         "customer": {
           "number": "+15192770970"  ← Caller's phone number
         }
       }
     }
   }

4. Server extracts phone number: +15192770970
5. Server checks vapi-memory.json for history

   IF NEW CALLER:
   - Load base prompt (enhanced-prompt.txt)
   - Set firstMessage: "Hey, this is Baton AI. How you doin'?..."

   IF RETURNING CALLER:
   - Load base prompt + conversation history
   - Build conversationSummary from last 3 calls
   - Inject into system prompt
   - Set firstMessage: "Hey! Good to hear from you again. Let's pick up where we left off."

6. Server returns assistant configuration to Vapi:
   {
     "assistant": {
       "model": {
         "provider": "openai",
         "model": "gpt-4",
         "messages": [
           {
             "role": "system",
             "content": "<base prompt>\n\n<conversation history>"
           }
         ]
       },
       "voice": {
         "provider": "playht",
         "voiceId": "jennifer"
       },
       "firstMessage": "...",
       "serverMessages": ["end-of-call-report", "transcript"]
     }
   }

7. Vapi starts call with this transient assistant configuration
```

**Key files:**
- `server-vapi-memory.js` lines 113-177: `handleAssistantRequest()` function
- `enhanced-prompt.txt`: Base system prompt with 6-Tier Discovery Framework

### Phase 2: During Call (transcript webhooks)

```
1. As conversation happens, Vapi sends real-time transcript updates
2. Webhook: POST /webhook/assistant-request (type: "transcript")
3. Server logs the transcript to console for debugging
4. No memory saved yet - just monitoring
```

**Key files:**
- `server-vapi-memory.js` lines 219-225: `handleTranscript()` function

### Phase 3: Call Ends (end-of-call-report webhook)

```
1. Caller or AI ends the call
2. Vapi sends webhook: POST /webhook/assistant-request (type: "end-of-call-report")
   Payload includes:
   {
     "message": {
       "type": "end-of-call-report",
       "call": {
         "id": "019a6139-691d-7993-8db0-b7bbd5a83451",
         "customer": { "number": "+15192770970" },
         "duration": 120,
         "endedReason": "customer-ended-call"
       },
       "artifact": {
         "messagesOpenAIFormatted": [
           { "role": "user", "content": "My business is a bakery" },
           { "role": "assistant", "content": "Tell me more about your bakery" }
         ]
       },
       "summary": "AI-generated summary of the call"
     }
   }

3. Server extracts:
   - Phone number: +15192770970
   - Call ID: 019a6139-691d-7993-8db0-b7bbd5a83451
   - Full transcript from artifact.messagesOpenAIFormatted
   - Metadata (duration, cost, AI summary)

4. Server saves to vapi-memory.json:
   - Creates customer record if new
   - Appends call to callHistory array
   - Rebuilds conversationSummary from last 3 calls
   - Writes to disk

5. Next call from this number will have memory!
```

**Key files:**
- `server-vapi-memory.js` lines 180-216: `handleEndOfCall()` function
- `server-vapi-memory.js` lines 38-64: `saveCallTranscript()` function

---

## Memory Storage Format

### vapi-memory.json Structure

```json
{
  "customers": {
    "+15192770970": {
      "phoneNumber": "+15192770970",
      "firstCall": "2025-11-08T02:07:53.122Z",
      "callHistory": [
        {
          "callId": "019a6139-691d-7993-8db0-b7bbd5a83451",
          "date": "2025-11-08T02:10:32.514Z",
          "transcript": [
            {
              "role": "user",
              "message": "My business is a bakery"
            },
            {
              "role": "assistant",
              "message": "Tell me more about your bakery"
            }
          ],
          "metadata": {
            "cost": 0.42,
            "duration": 120,
            "endedReason": "customer-ended-call",
            "summary": "Discussion about bakery business operations"
          }
        }
      ],
      "conversationSummary": "PREVIOUS CONVERSATION HISTORY:\n..."
    }
  }
}
```

### Conversation Summary Format

The `conversationSummary` field is what gets injected into the system prompt for returning callers. It's built from the **last 3 calls** and includes:

```
PREVIOUS CONVERSATION HISTORY:
This caller has called 3 time(s) before.

Call 1 (2025-11-07):
Summary: <Vapi AI-generated summary>

<Full transcript with User/Assistant labels, up to 800 chars>

Call 2 (2025-11-07):
Summary: <Vapi AI-generated summary>

<Full transcript with User/Assistant labels, up to 800 chars>

Call 3 (2025-11-07):
Summary: <Vapi AI-generated summary>

<Full transcript with User/Assistant labels, up to 800 chars>

IMPORTANT: Reference specific details from the previous conversation history above. The caller expects you to remember what they shared.
```

**Key implementation details:**
- **Full transcripts** (not just user messages) - provides context
- **800 character limit per call** - balances detail vs. token usage
- **Last 3 calls only** - keeps prompt manageable, focuses on recent context
- **Includes Vapi summaries** - concise overview plus detailed transcript
- **Explicit instruction** - tells AI to reference specifics

**Key files:**
- `server-vapi-memory.js` lines 66-98: `buildConversationSummary()` function

---

## Configuration Files

### 1. Vapi Phone Number Configuration

**File**: `configure-phone-server.js`

**Purpose**: Configures the Vapi phone number to use server URL instead of a fixed assistant

**Key settings:**
```javascript
const PHONE_NUMBER_ID = '8b7192dc-899d-4458-aaf9-af9d41efa8ae';
const NGROK_URL = 'https://sprier-sulfurously-wendy.ngrok-free.dev';

// CRITICAL: Set assistantId to null so Vapi calls our webhook
assistantId: null,
server: {
  url: `${NGROK_URL}/webhook/assistant-request`
}
```

**Why this matters**: If `assistantId` is set, Vapi uses that assistant directly and NEVER calls the webhook. Must be `null` for memory to work.

### 2. Environment Variables

**File**: `.env`

```
VAPI_API_KEY=714444cb-745d-4d24-9f44-1cb850001846
VAPI_ASSISTANT_ID=e94425fc-c2c4-4165-8559-94443c87aa20
PORT=3000
```

### 3. Base System Prompt

**File**: `enhanced-prompt.txt`

Contains the 6-Tier Discovery Framework prompt that guides all conversations. This is the foundation that memory history gets appended to.

---

## Technical Implementation Details

### Webhook Routing

The server uses **universal webhook routing** - all webhook types go to the same endpoint:

```javascript
app.post('/webhook/assistant-request', async (req, res) => {
  const messageType = req.body.message?.type || req.body.type;

  if (messageType === 'end-of-call-report') {
    return handleEndOfCall(req, res);
  } else if (messageType === 'transcript') {
    return handleTranscript(req, res);
  } else if (messageType === 'assistant-request') {
    return handleAssistantRequest(req, res);
  }
});
```

**Why**: Simplifies configuration, ensures all webhook types are received at one URL

### Transient Assistant Pattern

This system uses **transient assistants** - the assistant configuration is generated dynamically per call, not stored in Vapi:

**Benefits**:
- ✅ Each caller gets customized context (their memory)
- ✅ No need to create/manage separate assistants per customer
- ✅ Easy to update prompt logic (just edit enhanced-prompt.txt)
- ✅ Complete control over conversation history injection

**Trade-offs**:
- ❌ Server must be running for calls to work (no fallback assistant)
- ❌ Webhook latency adds ~500ms to call connection time
- ❌ More complex than using fixed Vapi assistants

### Memory Rebuilding

If the memory file format changes or gets corrupted, run:

```bash
node rebuild-memory.js
```

This script:
1. Reads vapi-memory.json
2. Regenerates conversationSummary for all customers using current logic
3. Writes updated memory back to disk

---

## Voice Provider: PlayHT

The system uses **PlayHT** as the voice provider (not Hume):

```javascript
voice: {
  provider: "playht",
  voiceId: "jennifer"
}
```

**Why PlayHT**:
- Hume voice integration was causing `pipeline-error-hume-ai-voice-connection-failed`
- PlayHT is natively supported by Vapi
- "Jennifer" voice provides professional, warm tone suitable for business conversations

---

## Debugging & Monitoring

### View Memory for a Customer

```bash
curl http://localhost:3000/memory/+15192770970
```

Returns full customer record with all call history.

### View All Memory

```bash
curl http://localhost:3000/memory
```

### Clear All Memory (Testing)

```bash
curl -X DELETE http://localhost:3000/memory
```

**⚠️ Warning**: This deletes all conversation history permanently.

### Server Logs

The server logs every webhook received:

```
📨 POST /webhook/assistant-request

🔍 DEBUG: Full webhook payload:
{...}

📞 Incoming call from: +15192770970
   ✅ RETURNING CALLER - 3 previous call(s)
   💭 Injecting conversation history (2847 chars)
```

**Key indicators**:
- `🆕 NEW CALLER` - First time calling
- `✅ RETURNING CALLER - N previous call(s)` - Has history
- `💾 Saved conversation for +15192770970 (N total calls)` - End-of-call saved

---

## Testing Strategy

### Local Webhook Testing

You can simulate Vapi webhooks locally using curl:

```bash
# Simulate end-of-call-report
curl -X POST http://localhost:3000/webhook/assistant-request \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "end-of-call-report",
      "call": {
        "id": "test-call-123",
        "customer": { "number": "+15192770970" }
      },
      "artifact": {
        "messagesOpenAIFormatted": [
          {"role": "user", "content": "My business is a bakery"},
          {"role": "assistant", "content": "Tell me more"}
        ]
      }
    }
  }'

# Verify memory was saved
curl http://localhost:3000/memory/+15192770970
```

### Real Call Testing

1. Ensure ngrok tunnel is running: `ngrok http 3000`
2. Ensure server is running: `node server-vapi-memory.js`
3. Call +1 (407) 436-6284 from your test phone
4. Have a conversation, mention specific business details
5. Hang up
6. Check server logs for "💾 Saved conversation"
7. Call again - AI should reference what you said

---

## Limitations & Future Improvements

### Current Limitations

1. **Local storage only** - Memory is stored in a JSON file, not a database
   - Risk of data loss if file is corrupted
   - No concurrent write protection
   - Doesn't scale beyond a few hundred customers

2. **Last 3 calls only** - Older conversations are archived but not actively used
   - Trade-off between context depth and token cost
   - May miss important details from earlier calls

3. **No semantic search** - Can't query "what did customer say about suppliers?"
   - All context is dumped into prompt as text
   - LLM must find relevant details itself

4. **Single phone number** - No cross-device memory
   - If customer calls from different number, treated as new caller
   - No way to merge records

### Potential Improvements

1. **Database storage** (PostgreSQL + vector embeddings)
   - Store transcripts in database with semantic search
   - Query relevant past conversations on-demand
   - "Show me all times this customer mentioned cash flow issues"

2. **Intelligent memory summarization**
   - Use LLM to extract key facts: "Customer owns a bakery in Miami, 5 employees, main concern is succession planning"
   - Store structured facts separately from full transcripts
   - Inject facts + relevant transcript excerpts (not just last 3 calls)

3. **Customer identity linking**
   - Ask for email/name on first call
   - Link multiple phone numbers to same customer
   - "Oh, I recognize you from the call last week!"

4. **Memory verification prompts**
   - "Last time you mentioned X. Is that still accurate?"
   - Catch outdated information
   - Allow customer to correct misremembered details

5. **Progress tracking UI**
   - Dashboard showing which customers are in which tier
   - Flag customers who dropped off mid-discovery
   - Alert if customer hasn't called back in 7 days

---

## Troubleshooting

### Memory not working - AI doesn't remember previous calls

**Diagnosis checklist**:

1. ✅ Check server logs - is end-of-call-report webhook being received?
   ```
   Look for: "💾 Saved conversation for +15192770970"
   ```

2. ✅ Check vapi-memory.json - is conversation saved?
   ```bash
   cat vapi-memory.json | grep "+15192770970"
   ```

3. ✅ Check conversation summary format - is it readable?
   ```bash
   node -e "const fs=require('fs'); console.log(JSON.parse(fs.readFileSync('vapi-memory.json')).customers['+15192770970'].conversationSummary)"
   ```

4. ✅ Check server logs on next call - is history being injected?
   ```
   Look for: "✅ RETURNING CALLER - N previous call(s)"
   Look for: "💭 Injecting conversation history (N chars)"
   ```

5. ✅ Check phone number configuration - is assistantId null?
   ```bash
   node configure-phone-server.js
   # Should see: "assistantId": null
   ```

**Common issues**:

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Webhook not received | Ngrok tunnel expired | Restart ngrok, update phone config |
| Phone has assistantId | Vapi uses fixed assistant | Run configure-phone-server.js |
| Summary missing details | Old summary format | Run rebuild-memory.js |
| AI ignores history | History not in system prompt | Check handleAssistantRequest() injects history |

### Calls failing to connect

**Check**:
1. Server running? `lsof -ti:3000` should return PID
2. Ngrok tunnel active? Visit ngrok URL in browser
3. Voice provider working? Check logs for `pipeline-error-`

**If voice fails**:
- Current provider: PlayHT (working)
- Previous provider: Hume (broken - connection errors)
- See server-vapi-memory.js:162-165

---

## Cost Considerations

### Vapi Pricing (as of 2025)

- **Per-minute cost**: ~$0.10-0.15 per minute
- **Components**: Deepgram (transcription) + OpenAI GPT-4 (LLM) + PlayHT (voice)
- **Memory cost**: Free (our server, our storage)

### Token Usage Impact

Adding conversation history increases GPT-4 token usage:

- **Base prompt**: ~2,000 tokens
- **Last 3 calls history**: ~1,500-3,000 tokens (depends on conversation length)
- **Total system prompt**: ~4,000-5,000 tokens

**Cost per call with memory**: $0.04-0.08 more per call (GPT-4 input tokens)

**Optimization strategies**:
1. Limit to 3 calls (not 5+)
2. Truncate each call at 800 chars (not full transcript)
3. Use GPT-3.5-turbo for simple calls (10x cheaper)
4. Semantic search to inject only relevant history (future)

---

## Production Deployment Considerations

### Moving from Local to Production

**Current setup (development)**:
- Local server: `localhost:3000`
- Ngrok tunnel: `https://sprier-sulfurously-wendy.ngrok-free.dev`
- Storage: `vapi-memory.json` file

**Production requirements**:
1. **Hosting**: Deploy to cloud server (AWS EC2, Heroku, Render, etc.)
2. **Domain**: Use real domain instead of ngrok
3. **Storage**: Migrate from JSON file to database (PostgreSQL + Redis)
4. **Monitoring**: Add error tracking (Sentry), uptime monitoring
5. **Backups**: Automated daily backups of conversation data
6. **Security**: HTTPS, webhook signature verification
7. **Scaling**: Load balancer if >100 concurrent calls

### Security Considerations

**Current risks**:
- ❌ No webhook signature verification (anyone could POST fake webhooks)
- ❌ No rate limiting (vulnerable to DoS)
- ❌ No data encryption at rest (vapi-memory.json is plaintext)
- ❌ Ngrok tunnel publicly accessible

**Production fixes**:
1. Verify Vapi webhook signatures
2. Rate limit endpoints
3. Encrypt sensitive customer data
4. Use API key authentication for admin endpoints
5. GDPR compliance: customer data deletion on request

---

## Key Takeaways

### What Makes This Architecture Work

1. **Phone-level server URL** - Vapi calls webhook before every call
2. **Transient assistants** - Dynamic context injection per caller
3. **Full transcript storage** - Complete conversation history, not just summaries
4. **Last 3 calls context** - Balance between memory depth and token cost
5. **Explicit memory instruction** - Tells AI to reference specific details

### Critical Success Factors

- ✅ `assistantId: null` on phone number (forces webhook call)
- ✅ `serverMessages: ["end-of-call-report"]` in assistant config
- ✅ Universal webhook routing (all types → same endpoint)
- ✅ Full transcript in conversationSummary (not just user messages)
- ✅ PlayHT voice provider (Hume was broken)

### The Bug That Broke Memory

**Original issue**: AI couldn't remember "bicycle tires" even though it was saved.

**Root cause**: `buildConversationSummary()` only extracted user messages and truncated at 300 chars, so the critical detail was lost.

**Fix**: Include full transcripts (user + assistant), increase to 800 chars, include last 3 calls (not 2).

**Lesson**: Memory isn't just about saving data - it's about formatting context in a way the LLM can actually use.

---

## File Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `server-vapi-memory.js` | Main webhook server | handleAssistantRequest(), handleEndOfCall(), buildConversationSummary() |
| `vapi-memory.json` | Persistent storage | Customer records with full call history |
| `enhanced-prompt.txt` | Base system prompt | 6-Tier Discovery Framework |
| `configure-phone-server.js` | Phone setup script | Sets assistantId=null, configures server URL |
| `rebuild-memory.js` | Memory repair tool | Regenerates conversation summaries |
| `.env` | API keys | VAPI_API_KEY, VAPI_ASSISTANT_ID |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**System Status**: ✅ Production-ready (with limitations noted above)

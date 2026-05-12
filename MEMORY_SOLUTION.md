# The Truth About Voice AI Memory

## What I've Learned

After extensive testing with both Hume EVI and Vapi:

**NEITHER platform has built-in "automatic" conversation memory across phone calls.**

Both platforms require you to:
1. Save transcripts after each call
2. Manually inject previous conversation history into the system prompt for returning callers
3. Build your own database/storage for conversation history

## Why Vapi Hasn't Worked

The `serverUrl` (assistant-request) webhook I configured **doesn't work for inbound phone calls the way I expected**. It works for SDK/web calls, but for phone calls, Vapi doesn't call this webhook before connecting the call.

## The Actual Solution

Since we already have:
- ✅ Transcript webhooks working (`end-of-call-report`)
- ✅ Customer phone number tracking
- ✅ Local database for storing conversation history

We need to use **OUTBOUND** calls or **programmatic call initiation** where we CAN control the assistant configuration with conversation history.

For **inbound calls** (what you're using), Vapi doesn't provide a way to dynamically inject memory before the call connects.

## Recommendations

**Option 1: Switch to Outbound Pattern**
- User texts/schedules a call
- Your server initiates outbound call via Vapi API
- You create temporary assistant with conversation history injected
- This WILL work because you control assistant creation

**Option 2: Use Vapi Squad (Advanced)**
- Configure a "squad" of assistants
- Use routing logic to select assistant with correct memory
- More complex but supports inbound

**Option 3: Accept Manual Continuity**
- AI explicitly asks "Have we spoken before?"
- Uses conversation prompts to reconstruct context
- Not automated but works within current constraints

**Option 4: Return to Hume with Refined Approach**
- Similar constraints, but Hume's resume parameter might work better
- Would need to test the approach we tried earlier more thoroughly

## Bottom Line

True automated conversation memory for inbound phone calls is NOT a standard feature of either platform. It requires architectural changes to how calls are initiated/handled.


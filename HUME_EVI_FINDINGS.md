# Hume EVI Integration Findings

## Summary

Successfully created a Hume EVI configuration with your custom voice "Ian" and the Human-Centered Constitution system prompt.

## Key Discoveries

### 1. Custom Voice ID Format (SOLVED)

**Problem:** Initial attempts to use custom voice ID `5bd05afd-db0f-42c0-950e-be2f6e8ba39c` failed with "voice not found" errors.

**Solution:** Use the correct voice configuration format:

```javascript
voice: {
  provider: 'CUSTOM_VOICE',  // Not 'HUME_AI'
  id: '5bd05afd-db0f-42c0-950e-be2f6e8ba39c'  // Use 'id' not 'name'
}
```

**Important Notes:**
- `CUSTOM_VOICE` is the default provider for your private custom voices
- `HUME_AI` provider is only for Voice Library voices (like ITO, KORA, etc.)
- Must use `id` field, not `name` field, for custom voices
- Your custom voice is named "Ian" in the Hume platform

### 2. EVI Version Format (SOLVED)

**Problem:** Multiple version format errors trying different enums.

**Solution:** Use string `'3'` for EVI version:

```javascript
eviVersion: '3'  // String, not enum or number
```

Options are `'3'` or `'4-mini'` as strings.

### 3. Working Configuration

**Config ID:** `65426076-2e45-4048-ae73-858bcd7a8478`

**Full Working Code:**
```javascript
const config = await hume.empathicVoice.configs.createConfig({
  eviVersion: '3',
  name: 'Baton AI - Human-Centered Voice Agent (Custom Voice)',
  prompt: {
    text: systemPrompt  // 1072 character Human-Centered Constitution
  },
  voice: {
    provider: 'CUSTOM_VOICE',
    id: '5bd05afd-db0f-42c0-950e-be2f6e8ba39c'
  }
});
```

## Current Status

✅ Hume SDK installed and configured
✅ Custom voice "Ian" successfully integrated
✅ Human-Centered Constitution system prompt injected
✅ EVI configuration created and saved to .env

## Next Steps

### Phase 2: Twilio Media Streams Integration

The next phase requires replacing the current Twilio webhook architecture with WebSocket-based Media Streams:

**Current Architecture (to be replaced):**
```
Caller → Twilio → Webhook POST → OpenAI → TwiML → Twilio Polly TTS → Caller
```

**Target Architecture:**
```
Caller → Twilio Media Streams (WebSocket) → Hume EVI → Caller
```

**Required Changes:**

1. **Add WebSocket Server** to `server.js`
   - Install `ws` package (already installed)
   - Create WebSocket endpoint for Twilio Media Streams
   - Handle `start`, `media`, `stop` events

2. **Bridge Twilio ↔ Hume**
   - Convert Twilio audio format (μ-law 8kHz) to Hume format
   - Establish bidirectional audio streaming
   - Use Hume WebSocket API with config ID

3. **Update Twilio Webhook**
   - Replace `<Gather>` with `<Connect><Stream>` in `/voice` endpoint
   - Point to WebSocket URL

4. **Test End-to-End**
   - Call Twilio number
   - Verify audio flows through Hume EVI
   - Test emotional intelligence features
   - Validate Human-Centered Constitution behavior

## Resources

- **Hume EVI Docs:** https://dev.hume.ai/docs/empathic-voice-interface-evi/overview
- **Twilio Media Streams:** https://www.twilio.com/docs/voice/twiml/stream
- **Custom Voice Management:** Hume Platform → Voices section

## Test Results

```
🧪 Testing Hume EVI Connection...
✅ Hume client initialized
📋 Using Voice ID: 5bd05afd-db0f-42c0-950e-be2f6e8ba39c
📝 System Prompt prepared (Human-Centered Constitution)
   Length: 1072 characters
⚙️  Creating EVI configuration...
✅ Configuration created successfully!
   Config ID: 65426076-2e45-4048-ae73-858bcd7a8478
   Name: Baton AI - Human-Centered Voice Agent (Custom Voice)
   Voice: Ian
🎉 Test completed successfully!
```

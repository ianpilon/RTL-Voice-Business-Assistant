require('dotenv').config();
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Incoming call webhook from Twilio
app.post('/voice', async (req, res) => {
  const callerPhone = req.body.From;
  const callSid = req.body.CallSid;

  console.log(`\n📞 Incoming call from: ${callerPhone}`);
  console.log(`   CallSid: ${callSid}`);

  // Return TwiML that redirects to Vapi's phone endpoint
  // Vapi will handle the call and maintain memory based on caller phone number
  const vapiUrl = `https://api.vapi.ai/call/twilio`;

  // Add query parameters for the assistant and customer identification
  const params = new URLSearchParams({
    assistantId: process.env.VAPI_ASSISTANT_ID,
    // Vapi will automatically use From number for customer identification
  });

  const fullUrl = `${vapiUrl}?${params.toString()}`;

  console.log(`   ✨ Redirecting to Vapi: ${process.env.VAPI_ASSISTANT_ID}`);
  console.log(`   💾 Memory enabled for: ${callerPhone}`);

  // Generate TwiML that redirects to Vapi
  const twilio = require('twilio');
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.redirect(fullUrl);

  res.type('text/xml');
  res.send(twiml.toString());
});

// Twilio status callback
app.post('/status', async (req, res) => {
  const { CallSid, CallStatus, From } = req.body;

  console.log(`\n📞 Call status: ${CallStatus}`);
  console.log(`   CallSid: ${CallSid}`);
  console.log(`   From: ${From}`);

  res.sendStatus(200);
});

// Vapi webhook endpoint (for tracking call events)
app.post('/vapi-webhook', async (req, res) => {
  const event = req.body;

  console.log(`\n🔔 Vapi event: ${event.type}`);

  switch (event.type) {
    case 'call-started':
      console.log(`   Call ID: ${event.call.id}`);
      console.log(`   Customer: ${event.call.customer?.number || 'Unknown'}`);
      break;

    case 'call-ended':
      console.log(`   Call ID: ${event.call.id}`);
      console.log(`   Duration: ${event.call.durationMinutes} minutes`);
      console.log(`   Cost: $${event.call.cost}`);
      console.log(`   End reason: ${event.call.endedReason}`);
      break;

    case 'transcript':
      const role = event.transcript.role === 'user' ? '👤 User' : '🤖 Assistant';
      console.log(`   ${role}: ${event.transcript.text}`);
      break;

    case 'function-call':
      console.log(`   Function: ${event.functionCall.name}`);
      console.log(`   Parameters: ${JSON.stringify(event.functionCall.parameters)}`);
      break;

    case 'hang':
      console.log(`   Call hung up`);
      break;

    case 'speech-update':
      console.log(`   Speech: ${event.speech.text}`);
      break;
  }

  res.sendStatus(200);
});

// API: Check if assistant is configured
app.get('/status', (req, res) => {
  const configured = !!(process.env.VAPI_API_KEY && process.env.VAPI_ASSISTANT_ID);

  res.json({
    configured,
    assistantId: process.env.VAPI_ASSISTANT_ID || 'NOT_SET',
    hasApiKey: !!process.env.VAPI_API_KEY,
    ready: configured
  });
});

app.listen(port, () => {
  console.log('\n🚀 Baton AI Voice Server (Vapi Integration)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log(`📞 Voice webhook: POST /voice`);
  console.log(`📊 Status callback: POST /status`);
  console.log(`🔔 Vapi webhook: POST /vapi-webhook`);
  console.log(`✅ Health check: GET /status`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n✨ Baton AI Features:');
  console.log('   ✓ 6-Tier Discovery Framework');
  console.log('   ✓ Human-centered communication');
  console.log('   ✓ Automatic conversation memory');
  console.log('   ✓ Multi-call strategy support');
  console.log('   ✓ Tier 1 priority: Business survival knowledge');

  console.log('\n💡 How Memory Works:');
  console.log('   1. Twilio forwards call → /voice webhook');
  console.log('   2. Server redirects to Vapi with assistant ID');
  console.log('   3. Vapi uses caller phone number as customer ID');
  console.log('   4. Vapi automatically maintains conversation history');
  console.log('   5. Returning callers get personalized experience');

  console.log('\n⚙️  Configuration:');
  console.log(`   Assistant ID: ${process.env.VAPI_ASSISTANT_ID || '❌ NOT SET'}`);
  console.log(`   API Key: ${process.env.VAPI_API_KEY ? '✓ Configured' : '❌ NOT SET'}`);

  console.log('\n📋 Next Steps:');
  console.log('   1. Run ngrok: ngrok http 3000');
  console.log('   2. Update Twilio webhook to: https://your-ngrok-url/voice');
  console.log('   3. Make a test call to your Twilio number');
  console.log('   4. Call again to test conversation memory!\n');

  if (!process.env.VAPI_ASSISTANT_ID) {
    console.log('⚠️  WARNING: VAPI_ASSISTANT_ID not set in .env file!\n');
  }
});

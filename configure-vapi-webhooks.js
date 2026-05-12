require('dotenv').config();
const fetch = require('node-fetch');

const NGROK_URL = 'https://sprier-sulfurously-wendy.ngrok-free.dev';

async function configureWebhooks() {
  try {
    console.log('Configuring Vapi assistant with webhook URLs...\n');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Server URL is called BEFORE each call starts to customize the assistant
        serverUrl: `${NGROK_URL}/webhook/assistant-request`,

        // Server messages we want to receive
        serverMessages: [
          "end-of-call-report",   // Get full transcript when call ends
          "transcript"             // Get real-time transcript updates
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to configure webhooks');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Webhooks configured successfully!\n');
    console.log('📍 Server URL:', data.serverUrl);
    console.log('📨 Server Messages:', data.serverMessages);

    console.log('\n🎯 How it works:');
    console.log('   1. Call comes in → Vapi calls your server at /webhook/assistant-request');
    console.log('   2. Server checks if caller has history');
    console.log('   3. If returning caller: inject conversation history into prompt');
    console.log('   4. Call ends → Vapi calls /webhook/end-of-call-report');
    console.log('   5. Server saves transcript to local database');
    console.log('   6. Next call from same number will have memory!\n');

    console.log('✅ Ready to test! Call your Vapi number: +1 (407) 436-6284');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

configureWebhooks();

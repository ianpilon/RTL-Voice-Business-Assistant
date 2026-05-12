require('dotenv').config();
const fetch = require('node-fetch');

const PHONE_NUMBER_ID = '8b7192dc-899d-4458-aaf9-af9d41efa8ae';
const NGROK_URL = 'https://sprier-sulfurously-wendy.ngrok-free.dev';

async function configurePhoneNumber() {
  try {
    console.log('Configuring phone number server URL...\n');

    const response = await fetch(`https://api.vapi.ai/phone-number/${PHONE_NUMBER_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // REMOVE assistantId so Vapi will call our server URL for EVERY call
        assistantId: null,
        server: {
          url: `${NGROK_URL}/webhook/assistant-request`,
          // Request end-of-call-report to be sent to our webhook
          serverMessages: ["end-of-call-report", "transcript"]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to configure phone number');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Phone number server URL configured!\n');
    console.log('Server URL:', data.server?.url || 'NOT SET');
    console.log('\n📝 Full response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

configurePhoneNumber();

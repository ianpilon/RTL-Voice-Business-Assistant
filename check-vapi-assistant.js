require('dotenv').config();
const fetch = require('node-fetch');

async function checkAssistant() {
  try {
    console.log('Checking Vapi assistant configuration...\n');
    console.log('Assistant ID:', process.env.VAPI_ASSISTANT_ID);

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to fetch assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Assistant found!\n');
    console.log('Name:', data.name);
    console.log('Model:', data.model?.provider, data.model?.model);
    console.log('Voice:', data.voice?.provider, data.voice?.voiceId);
    console.log('First Message:', data.firstMessage);
    console.log('\n📝 Full configuration:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAssistant();

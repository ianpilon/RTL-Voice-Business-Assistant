require('dotenv').config();
const fetch = require('node-fetch');

async function fixAssistant() {
  try {
    console.log('Removing serverUrl from Vapi assistant...\n');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serverUrl: null,
        serverMessages: []
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to update assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Assistant updated successfully!\n');
    console.log('Server URL:', data.serverUrl || 'REMOVED ✓');
    console.log('Server Messages:', data.serverMessages || 'REMOVED ✓');
    console.log('\n🎉 Your phone number should work now!');
    console.log('📞 Try calling: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAssistant();

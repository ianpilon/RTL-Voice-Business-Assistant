require('dotenv').config();
const fetch = require('node-fetch');

async function removeServerUrl() {
  try {
    console.log('Removing server webhook configuration from assistant...\n');

    // First, let's get the full current config
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const currentConfig = await getResponse.json();
    console.log('Current server config:', currentConfig.server);
    console.log('Current serverUrl:', currentConfig.serverUrl);
    console.log('Current serverMessages:', currentConfig.serverMessages);

    // Now update to remove server completely
    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        server: null,
        serverUrl: null,
        serverMessages: []
      })
    });

    const data = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error('❌ Failed to update assistant');
      console.error('Status:', updateResponse.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('\n✅ Assistant updated successfully!\n');
    console.log('Server:', data.server || 'REMOVED ✓');
    console.log('Server URL:', data.serverUrl || 'REMOVED ✓');
    console.log('Server Messages:', data.serverMessages);
    console.log('\n🎉 Try calling again: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

removeServerUrl();

require('dotenv').config();
const fetch = require('node-fetch');

async function fixAssistantVoice() {
  try {
    console.log('Updating assistant to use a reliable voice provider...\n');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        voice: {
          provider: "playht",
          voiceId: "jennifer"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to update assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Assistant voice updated successfully!\n');
    console.log('Voice Provider:', data.voice?.provider);
    console.log('Voice ID:', data.voice?.voiceId);
    console.log('\n🎉 Try calling again: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAssistantVoice();

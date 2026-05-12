require('dotenv').config();
const fetch = require('node-fetch');

async function fixHangupIssue() {
  try {
    console.log('Fixing call hangup issue...\n');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Remove common phrases that might accidentally end the call
        endCallPhrases: [
          "goodbye",
          "bye bye",
          "end call",
          "hang up"
        ],
        // Increase silence timeout if needed
        silenceTimeoutSeconds: 30,
        // Adjust response delay
        responseDelaySeconds: 0.4
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to update assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Call hangup settings fixed!\n');
    console.log('Changes made:');
    console.log('  ✓ Removed "thank you" and "thanks" from end call phrases');
    console.log('  ✓ Removed "that\'s all" from end call phrases');
    console.log('  ✓ Only specific phrases will end the call now:');
    console.log('    - "goodbye"');
    console.log('    - "bye bye"');
    console.log('    - "end call"');
    console.log('    - "hang up"');
    console.log('\n🎉 Try calling again - it should stay on longer!');
    console.log('📞 Call: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixHangupIssue();

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

async function updateGracefulClose() {
  try {
    console.log('Updating assistant with graceful close flow...\n');

    const systemPrompt = fs.readFileSync('./legal-services-prompt.txt', 'utf8');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: {
          provider: "openai",
          model: "gpt-4",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: systemPrompt
            }
          ]
        },
        // Remove end call phrases - let the AI control the closing naturally
        endCallPhrases: [],
        // Update the end call message
        endCallMessage: "Thanks for calling IOG legal services. Have a great day!",
        // Give AI ability to end call via function
        endCallFunctionEnabled: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to update assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Graceful close flow configured!\n');
    console.log('How it works now:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  User: "That\'s all I need, thanks"');
    console.log('');
    console.log('2️⃣  AI: "Great! So I\'ll have the contracts team reach out.');
    console.log('       Is there anything else I can help you with?"');
    console.log('');
    console.log('3️⃣  User: "No, that\'s it"');
    console.log('');
    console.log('4️⃣  AI: "Perfect. Thanks for calling IOG legal services,');
    console.log('       and have a great day!"');
    console.log('');
    console.log('5️⃣  [Call ends naturally]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✨ Benefits:');
    console.log('  ✓ No abrupt hangups');
    console.log('  ✓ User always gets a chance to add more');
    console.log('  ✓ Clear closing summary');
    console.log('  ✓ Professional exit');
    console.log('');
    console.log('🎉 Try calling to test: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateGracefulClose();

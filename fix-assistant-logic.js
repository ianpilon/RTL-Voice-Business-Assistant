require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

async function fixAssistantLogic() {
  try {
    console.log('Fixing assistant logic and conversation flow...\n');

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
        // Disable AI ability to end calls arbitrarily
        endCallFunctionEnabled: false,
        // Keep simple end call phrases for when user explicitly says goodbye
        endCallPhrases: [
          "goodbye",
          "bye"
        ],
        // Friendly end message
        endCallMessage: "Thanks for calling IOG legal services. Have a great day!",
        // Give AI reasonable silence timeout
        silenceTimeoutSeconds: 30,
        // Reasonable response delay
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

    console.log('✅ Assistant logic fixed!\n');
    console.log('Changes made:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✓ Removed rigid "DO THIS FIRST" name collection');
    console.log('✓ AI now responds naturally to questions first');
    console.log('✓ Employee lookup is optional - only when helpful');
    console.log('✓ Disabled AI ending calls arbitrarily');
    console.log('✓ Simplified end call phrases (only "goodbye"/"bye")');
    console.log('✓ Improved graceful close flow');
    console.log('');
    console.log('Expected behavior now:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User: "What\'s our non-compete policy?"');
    console.log('AI: [Answers the question or searches policy docs]');
    console.log('');
    console.log('User: "This is Billy"');
    console.log('AI: [Optionally looks up Billy for context]');
    console.log('    "Thanks Billy! I see you\'re on the Marketing team."');
    console.log('');
    console.log('User: "That\'s all, thanks"');
    console.log('AI: "Got it. Is there anything else I can help with?"');
    console.log('User: "No"');
    console.log('AI: "Perfect! Have a great day!"');
    console.log('');
    console.log('🎉 Try calling again: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAssistantLogic();

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

// Read the legal services prompt
const systemPrompt = fs.readFileSync('./legal-services-prompt.txt', 'utf8');

async function updateAssistant() {
  try {
    console.log('Updating assistant to IOG Legal Services configuration...\n');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: "IOG Legal Services",
        firstMessage: "Hello, you've reached IOG in-house legal counsel. How can I help you today?",
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
        endCallMessage: "Thank you for calling IOG legal services. Have a great day.",
        endCallPhrases: [
          "goodbye",
          "bye",
          "that's all",
          "thank you",
          "thanks"
        ]
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
    console.log('Name:', data.name);
    console.log('First Message:', data.firstMessage);
    console.log('End Call Message:', data.endCallMessage);
    console.log('\n🎉 IOG Legal Services assistant is ready!');
    console.log('📞 Call: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateAssistant();

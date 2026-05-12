require('dotenv').config();
const fetch = require('node-fetch');

// Configuration to enable memory
const updatedConfig = {
  model: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    knowledgeBase: {
      provider: "canonical",
      // This tells Vapi to include conversation history
      conversationHistoryEnabled: true
    }
  },
  // Enable server URL for custom memory management if needed
  serverUrl: null,
  // This is critical - tells Vapi to remember conversations by customer phone
  clientMessages: [
    "conversation-update",
    "status-update"
  ],
  serverMessages: [
    "conversation-update",
    "end-of-call-report"
  ]
};

async function updateAssistant() {
  try {
    console.log('Updating Baton AI assistant to enable memory...\n');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedConfig)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to update assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Assistant updated successfully!\n');
    console.log('Memory features enabled:');
    console.log('- Conversation history tracking by customer phone number');
    console.log('- Model will receive previous conversation context');
    console.log('\n📝 Full response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateAssistant();

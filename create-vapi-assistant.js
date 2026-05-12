require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

// Read the enhanced prompt
const systemPrompt = fs.readFileSync('./enhanced-prompt.txt', 'utf8');

const assistantConfig = {
  name: "Baton AI Discovery",
  model: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    systemPrompt: systemPrompt,
    messages: []
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah", // Warm, professional female voice
    stability: 0.5,
    similarityBoost: 0.75
  },
  firstMessage: "Hey, this is Baton AI. How you doin'? We help business owners like you preserve what you've built. This is a relaxed conversation - we can take as long as you need, or break it into multiple calls. Is now a good time?",
  recordingEnabled: true,
  endCallMessage: "Thank you for your time. Looking forward to continuing our conversation.",
  endCallPhrases: [
    "goodbye",
    "bye",
    "talk to you later",
    "gotta go",
    "have to go"
  ],
  maxDurationSeconds: 1800, // 30 minutes max
  backgroundSound: "off",
  backchannelingEnabled: true,
  backgroundDenoisingEnabled: true,
  modelOutputInMessagesEnabled: true
};

async function createAssistant() {
  try {
    console.log('Creating Baton AI assistant on Vapi...\n');

    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assistantConfig)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to create assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Assistant created successfully!\n');
    console.log('Assistant ID:', data.id);
    console.log('Name:', data.name);
    console.log('Model:', data.model.provider, data.model.model);
    console.log('Voice:', data.voice.provider, data.voice.voiceId);

    // Save the assistant ID to .env
    const envContent = fs.readFileSync('.env', 'utf8');
    if (!envContent.includes('VAPI_ASSISTANT_ID=')) {
      fs.appendFileSync('.env', `\nVAPI_ASSISTANT_ID=${data.id}\n`);
      console.log('\n✅ Saved VAPI_ASSISTANT_ID to .env file');
    }

    console.log('\n📝 Full response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAssistant();

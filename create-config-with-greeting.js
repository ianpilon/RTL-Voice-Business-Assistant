require('dotenv').config();
const { HumeClient } = require('hume');
const fs = require('fs');

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

const fullPrompt = fs.readFileSync('enhanced-prompt.txt', 'utf8');

console.log('🎤 Creating Hume EVI config with first-speaker greeting...');

hume.empathicVoice.configs.createConfig({
  eviVersion: '3',
  name: 'Baton AI - Discovery System (Speaks First)',
  prompt: {
    text: fullPrompt
  },
  voice: {
    provider: 'CUSTOM_VOICE',
    id: '4b305eef-58eb-455c-a154-be40c3129d0b'  // Updated voice
  },
  eventMessages: {
    onNewChat: {
      enabled: true,
      text: "Hey, this is Baton AI. Did your broker send you? We help business owners preserve what they've built through structured discovery conversations. Is now a good time to talk?"
    }
  }
})
.then(config => {
  console.log(`\n✅ Successfully created config!`);
  console.log(`   Config ID: ${config.id}`);
  console.log(`   Name: ${config.name}`);
  console.log(`\n📞 UPDATE TWILIO WEBHOOK TO:`);
  console.log(`https://api.hume.ai/v0/evi/twilio?config_id=${config.id}&api_key=${process.env.HUME_API_KEY}`);
  console.log(`\n💾 Update .env: HUME_CONFIG_ID=${config.id}`);
})
.catch(err => {
  console.error('❌ Error:', err.message);
  if (err.body) {
    console.error('Body:', JSON.stringify(err.body, null, 2));
  }
});

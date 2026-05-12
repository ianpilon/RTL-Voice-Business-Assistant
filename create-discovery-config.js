require('dotenv').config();
const { HumeClient } = require('hume');
const fs = require('fs');

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

const fullPrompt = fs.readFileSync('enhanced-prompt.txt', 'utf8');

console.log('🎤 Creating new Hume EVI config with discovery questions...');
console.log(`   Prompt length: ${fullPrompt.length} characters`);

hume.empathicVoice.configs.createConfig({
  eviVersion: '3',
  name: 'Baton AI - Discovery System (With Questions)',
  prompt: { text: fullPrompt },
  voice: {
    provider: 'CUSTOM_VOICE',
    id: '5bd05afd-db0f-42c0-950e-be2f6e8ba39c'  // Ian voice
  }
})
.then(config => {
  console.log(`\n✅ Successfully created config!`);
  console.log(`   Config ID: ${config.id}`);
  console.log(`   Name: ${config.name}`);
  console.log(`\n📞 UPDATE TWILIO WEBHOOK TO:`);
  console.log(`https://api.hume.ai/v0/evi/twilio?config_id=${config.id}&api_key=${process.env.HUME_API_KEY}`);
  console.log(`\n💾 Also update your .env file with: HUME_CONFIG_ID=${config.id}`);
})
.catch(err => {
  console.error('❌ Error:', err.message);
  if (err.body) {
    console.error('Body:', JSON.stringify(err.body, null, 2));
  }
});

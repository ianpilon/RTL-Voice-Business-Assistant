require('dotenv').config();
const { HumeClient } = require('hume');
const fs = require('fs');

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

const fullPrompt = fs.readFileSync('enhanced-prompt.txt', 'utf8');

console.log('📝 Updating Hume config...');
console.log(`   Config ID: ${process.env.HUME_CONFIG_ID}`);
console.log(`   Prompt length: ${fullPrompt.length} characters`);

hume.empathicVoice.prompts.createPrompt({
  name: 'Baton AI Discovery Questions',
  text: fullPrompt,
  versionDescription: 'Full Tier 1-6 discovery questions'
})
.then(prompt => {
  console.log(`✅ Created prompt: ${prompt.id}`);

  // Now update the config to use this prompt
  return hume.empathicVoice.configs.updateConfig(
    process.env.HUME_CONFIG_ID,
    {
      prompt: { id: prompt.id }
    }
  );
})
.then(() => {
  console.log('✅ Successfully updated config with discovery questions!');
})
.catch(err => {
  console.error('❌ Error:', err.message);
  if (err.body) {
    console.error('Body:', JSON.stringify(err.body, null, 2));
  }
});

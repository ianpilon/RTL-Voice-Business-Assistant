require('dotenv').config();
const { HumeClient } = require('hume');
const fs = require('fs');

// Script to update existing Hume EVI configuration with enhanced prompt

async function updateHumeConfig() {
  console.log('🔄 Updating Hume EVI Configuration...\n');

  try {
    // Initialize Hume client
    const hume = new HumeClient({
      apiKey: process.env.HUME_API_KEY
    });

    console.log('✅ Hume client initialized');
    console.log(`📋 Updating Config ID: ${process.env.HUME_CONFIG_ID}\n`);

    // Read the enhanced prompt
    const enhancedPrompt = fs.readFileSync('./enhanced-prompt.txt', 'utf8');

    console.log('📝 Enhanced Prompt loaded');
    console.log(`   Length: ${enhancedPrompt.length} characters\n`);

    // Create a NEW configuration (SDK doesn't support updates)
    // We'll create a new one and you can switch to it
    console.log('⚙️  Creating new EVI configuration...');

    const updatedConfig = await hume.empathicVoice.configs.createConfig({
      eviVersion: '3',
      name: 'Baton AI - Enhanced Discovery Call Agent (Custom Voice)',
      prompt: {
        text: enhancedPrompt
      },
      voice: {
        provider: 'CUSTOM_VOICE',
        id: '5bd05afd-db0f-42c0-950e-be2f6e8ba39c' // Your "Ian" voice
      }
    });

    console.log('✅ Configuration updated successfully!');
    console.log(`   Config ID: ${updatedConfig.id}`);
    console.log(`   Name: ${updatedConfig.name}`);
    console.log(`   Voice: ${updatedConfig.voice?.name || 'Ian (Custom)'}\n`);

    console.log('🎉 New configuration created successfully!');
    console.log('📌 NEXT STEP: Update your Twilio webhook with the new URL:');
    console.log(`   https://api.hume.ai/v0/evi/twilio?config_id=${updatedConfig.id}&api_key=${process.env.HUME_API_KEY}`);
    console.log('\n📋 Or get the URL from Hume platform:');
    console.log('   1. Go to platform.hume.ai');
    console.log('   2. Click on this new configuration');
    console.log('   3. Click "Deploy" tab');
    console.log('   4. Copy the Twilio webhook URL');
    console.log('   5. Update in Twilio console\n');

    return updatedConfig;

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the update
updateHumeConfig()
  .then(() => {
    console.log('✨ Configuration update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Update failed');
    process.exit(1);
  });

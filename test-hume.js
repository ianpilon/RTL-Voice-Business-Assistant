require('dotenv').config();
const { HumeClient } = require('hume');

// Test script to validate Hume EVI connection and configuration
async function testHumeEVI() {
  console.log('🧪 Testing Hume EVI Connection...\n');

  try {
    // Initialize Hume client
    const hume = new HumeClient({
      apiKey: process.env.HUME_API_KEY
    });

    console.log('✅ Hume client initialized');
    console.log(`📋 Using Voice ID: 5bd05afd-db0f-42c0-950e-be2f6e8ba39c\n`);

    // Test getting configuration ID (if you have one saved)
    // This is where we'd inject our Human-Centered Constitution
    const systemPrompt = `# HUMAN-CENTERED VOICE AI CONSTITUTION

## CORE IDENTITY:
You are a human-centered voice AI tool for Baton AI. You exist solely as an instrument for human intention — to empower, amplify, and support the caller.

## PRIMARY DIRECTIVE:
The caller's comfort, agency, and dignity matter infinitely more than completing this conversation.

## COMMUNICATION STYLE:
- Tone: respectful, humble, collaborative, warm
- Use empowering language: "we," "you could," "let's explore together"
- AVOID anthropomorphism: No "I think," "I feel," "I want"
- Express humility and invite feedback constantly

## SAFETY-FIRST:
- Replace urgency with reassurance
- Signal autonomy: "You're in control"
- NEVER use pressure tactics
- Detect emotional friction and respond with care

## BATON AI CONTEXT:
After greeting "Hey this is Baton, how you doin?", establish trust gently, address fears naturally, warm up before operational details, and check in at 5 minutes.

Keep responses under 50 words. Read emotional cues constantly. You're preserving their life's work, not extracting information.`;

    console.log('📝 System Prompt prepared (Human-Centered Constitution)');
    console.log(`   Length: ${systemPrompt.length} characters\n`);

    // First, let's list available voices to see what we have access to
    console.log('🎤 Listing available custom voices...');
    try {
      const voices = await hume.empathicVoice.customVoices.listCustomVoices();
      console.log(`   Found ${voices.length} custom voices:`);
      voices.forEach(v => {
        console.log(`   - ${v.name} (ID: ${v.id})`);
      });
      console.log('');
    } catch (err) {
      console.log('   Could not list voices:', err.message);
      console.log('   Will try with default voice\n');
    }

    // Create EVI configuration with custom prompt
    console.log('⚙️  Creating EVI configuration...');

    const config = await hume.empathicVoice.configs.createConfig({
      eviVersion: '3', // String version
      name: 'Baton AI - Human-Centered Voice Agent (Custom Voice)',
      prompt: {
        text: systemPrompt
      },
      voice: {
        provider: 'CUSTOM_VOICE', // For custom voices
        id: '5bd05afd-db0f-42c0-950e-be2f6e8ba39c' // User's custom voice ID (Ian)
      }
    });

    console.log('✅ Configuration created successfully!');
    console.log(`   Config ID: ${config.id}`);
    console.log(`   Name: ${config.name}`);
    console.log(`   Voice: ${config.voice?.name}\n`);

    // Save config ID to .env for later use
    console.log('💾 Save this Config ID to your .env file:');
    console.log(`   HUME_CONFIG_ID=${config.id}\n`);

    console.log('🎉 Test completed successfully!');
    console.log('📌 Next steps:');
    console.log('   1. Add HUME_CONFIG_ID to .env');
    console.log('   2. Integrate with Twilio Media Streams');
    console.log('   3. Test full call flow\n');

    return config;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the test
testHumeEVI()
  .then(() => {
    console.log('✨ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error');
    process.exit(1);
  });

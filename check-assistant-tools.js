require('dotenv').config();
const fetch = require('node-fetch');

async function checkTools() {
  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('\n🔧 TOOLS/FUNCTIONS CONFIGURATION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (data.model && data.model.tools) {
      console.log(`Found ${data.model.tools.length} tools configured:\n`);
      data.model.tools.forEach((tool, idx) => {
        console.log(`${idx + 1}. ${tool.function.name}`);
        console.log(`   Description: ${tool.function.description}`);
        if (tool.server) {
          console.log(`   Server URL: ${tool.server.url}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ NO TOOLS CONFIGURED');
      console.log('\nThis means:');
      console.log('  - Employee lookup: NOT available');
      console.log('  - Legal RAG search: NOT available');
      console.log('  - AI is making up answers from its training data');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTools();

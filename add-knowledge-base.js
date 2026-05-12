require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function createKnowledgeBase() {
  try {
    console.log('Creating knowledge base for legal policies...\n');

    // First, let's create a knowledge base
    const createKBResponse = await fetch('https://api.vapi.ai/knowledge-base', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: "IOG Legal Policies",
        description: "In-house legal and compliance rules and policies"
      })
    });

    const kbData = await createKBResponse.json();

    if (!createKBResponse.ok) {
      console.error('❌ Failed to create knowledge base');
      console.error('Status:', createKBResponse.status);
      console.error('Error:', JSON.stringify(kbData, null, 2));
      return null;
    }

    console.log('✅ Knowledge base created!');
    console.log('ID:', kbData.id);
    console.log('Name:', kbData.name);

    return kbData.id;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function attachKnowledgeBaseToAssistant(knowledgeBaseId) {
  try {
    console.log('\nAttaching knowledge base to assistant...\n');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        knowledgeBase: {
          provider: "canonical",
          knowledgeBaseId: knowledgeBaseId
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to attach knowledge base');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Knowledge base attached to assistant!');
    console.log('\n📋 Next steps:');
    console.log('1. Upload your legal policy documents (PDF, DOCX, TXT)');
    console.log('2. Use the upload script or Vapi dashboard to add files');
    console.log('3. Test the assistant with questions about your policies');
    console.log('\nKnowledge Base ID:', knowledgeBaseId);
    console.log('Save this ID to upload documents later!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  const kbId = await createKnowledgeBase();
  if (kbId) {
    await attachKnowledgeBaseToAssistant(kbId);

    // Save the KB ID to .env for future use
    const envContent = fs.readFileSync('.env', 'utf8');
    if (!envContent.includes('VAPI_KNOWLEDGE_BASE_ID=')) {
      fs.appendFileSync('.env', `\nVAPI_KNOWLEDGE_BASE_ID=${kbId}\n`);
      console.log('\n✅ Saved VAPI_KNOWLEDGE_BASE_ID to .env file');
    }
  }
}

main();

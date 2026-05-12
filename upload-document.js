require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// Usage: node upload-document.js path/to/your/document.pdf

async function uploadDocument(filePath) {
  try {
    if (!process.env.VAPI_KNOWLEDGE_BASE_ID) {
      console.error('❌ VAPI_KNOWLEDGE_BASE_ID not found in .env');
      console.error('Please run add-knowledge-base.js first!');
      return;
    }

    if (!filePath) {
      console.error('❌ Please provide a file path');
      console.error('Usage: node upload-document.js path/to/your/document.pdf');
      return;
    }

    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return;
    }

    console.log('Uploading document to knowledge base...');
    console.log('File:', filePath);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await fetch(`https://api.vapi.ai/knowledge-base/${process.env.VAPI_KNOWLEDGE_BASE_ID}/document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to upload document');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('\n✅ Document uploaded successfully!');
    console.log('Document ID:', data.id);
    console.log('Name:', data.name || filePath);
    console.log('\n🎉 Your assistant can now answer questions using this document!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get file path from command line argument
const filePath = process.argv[2];
uploadDocument(filePath);

require('dotenv').config();
const fetch = require('node-fetch');

const PHONE_NUMBER_ID = 'c5f20f23-f16d-4f89-bd9f-345eefa4ce09'; // +17163022410

async function assignAssistant() {
  try {
    console.log('Assigning Baton AI assistant to phone number +1 (716) 302-2410...\n');

    const response = await fetch(`https://api.vapi.ai/phone-number/${PHONE_NUMBER_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: process.env.VAPI_ASSISTANT_ID
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to update phone number');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Phone number updated successfully!\n');
    console.log('Phone:', data.number || data.phoneNumber);
    console.log('Assistant ID:', data.assistantId);
    console.log('\n🎉 Ready to test! Call: +1 (716) 302-2410');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

assignAssistant();

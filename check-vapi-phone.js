require('dotenv').config();
const fetch = require('node-fetch');

async function checkPhoneNumber() {
  try {
    console.log('Fetching Vapi phone numbers...\n');

    const response = await fetch('https://api.vapi.ai/phone-number', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to fetch phone numbers');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('📞 Your Vapi Phone Numbers:\n');

    if (Array.isArray(data) && data.length > 0) {
      data.forEach((phone, index) => {
        console.log(`${index + 1}. ${phone.number || phone.phoneNumber}`);
        console.log(`   Assistant ID: ${phone.assistantId || 'NOT ASSIGNED ❌'}`);
        console.log(`   Name: ${phone.name || 'Unnamed'}`);
        console.log(`   ID: ${phone.id}`);
        console.log('');
      });

      // Check if any phone has our assistant
      const phoneWithAssistant = data.find(p => p.assistantId === process.env.VAPI_ASSISTANT_ID);
      if (phoneWithAssistant) {
        console.log(`✅ Phone ${phoneWithAssistant.number} is correctly assigned to your assistant`);
      } else {
        console.log(`⚠️  None of your phone numbers are assigned to assistant: ${process.env.VAPI_ASSISTANT_ID}`);
        console.log('   You need to assign the assistant in the Vapi dashboard!');
      }
    } else {
      console.log('No phone numbers found in your Vapi account.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPhoneNumber();

require('dotenv').config();
const fetch = require('node-fetch');

async function getRecentCalls() {
  try {
    console.log('Fetching recent call logs...\n');

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const calls = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to fetch calls');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(calls, null, 2));
      return;
    }

    console.log(`Found ${calls.length} recent calls\n`);

    // Show the most recent call details
    if (calls.length > 0) {
      const mostRecent = calls[0];

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('MOST RECENT CALL');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Call ID:', mostRecent.id);
      console.log('Status:', mostRecent.status);
      console.log('Started:', new Date(mostRecent.startedAt).toLocaleString());
      console.log('Duration:', mostRecent.endedAt ? `${Math.round((new Date(mostRecent.endedAt) - new Date(mostRecent.startedAt)) / 1000)} seconds` : 'In progress');
      console.log('End Reason:', mostRecent.endedReason || 'N/A');
      console.log('Customer:', mostRecent.customer?.number || 'Unknown');
      console.log('Cost:', `$${mostRecent.cost || 0}`);

      if (mostRecent.transcript) {
        console.log('\n📝 TRANSCRIPT:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        mostRecent.transcript.split('\n').forEach(line => {
          console.log(line);
        });
      }

      if (mostRecent.messages && mostRecent.messages.length > 0) {
        console.log('\n💬 MESSAGES:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        mostRecent.messages.forEach((msg, idx) => {
          console.log(`\n${idx + 1}. ${msg.role.toUpperCase()}:`);
          console.log(`   ${msg.message || msg.content}`);
          if (msg.time) {
            console.log(`   Time: ${new Date(msg.time).toLocaleTimeString()}`);
          }
        });
      }

      if (mostRecent.analysis) {
        console.log('\n📊 ANALYSIS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(JSON.stringify(mostRecent.analysis, null, 2));
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Show summary of all recent calls
      console.log('RECENT CALLS SUMMARY:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      calls.slice(0, 5).forEach((call, idx) => {
        const duration = call.endedAt ? `${Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000)}s` : 'ongoing';
        console.log(`${idx + 1}. ${new Date(call.startedAt).toLocaleString()} | ${duration} | ${call.endedReason || 'N/A'}`);
      });

    } else {
      console.log('No calls found.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getRecentCalls();

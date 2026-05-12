const fetch = require('node-fetch');

(async () => {
  const response = await fetch('http://localhost:3001/search-policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        toolCallList: [{
          id: 'call_test123',
          function: {
            arguments: {
              query: 'vendor onboarding'
            }
          }
        }]
      }
    })
  });
  
  const result = await response.json();
  console.log('\n✅ Vapi Response Format Test:');
  console.log(JSON.stringify(result, null, 2));
  
  // Verify format
  if (result.results && result.results[0] && result.results[0].toolCallId && result.results[0].result) {
    console.log('\n✅ Response format is CORRECT for Vapi!');
  } else {
    console.log('\n❌ Response format is WRONG!');
  }
})();

const fetch = require('node-fetch');

(async () => {
  console.log('\n🧪 Testing Search Algorithm Fix\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Test the problematic query that failed before
  console.log('\n1️⃣ Testing: "onboarding process" (previously failed)');
  const response1 = await fetch('http://localhost:3001/search-policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        toolCallList: [{
          id: 'test_call_1',
          function: {
            arguments: {
              query: 'onboarding process'
            }
          }
        }]
      }
    })
  });
  
  const result1 = await response1.json();
  console.log('Result preview:', result1.results[0].result.substring(0, 200));
  
  // Check if it contains the correct vendor onboarding steps
  const hasCorrectSteps = result1.results[0].result.includes('vendor risk assessment') 
    && result1.results[0].result.includes('W-9');
  
  console.log(hasCorrectSteps ? '✅ CORRECT - Found vendor onboarding steps' : '❌ WRONG - Still returning incorrect content');
  
  // Test the query that worked before
  console.log('\n2️⃣ Testing: "vendor onboarding process" (previously worked)');
  const response2 = await fetch('http://localhost:3001/search-policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        toolCallList: [{
          id: 'test_call_2',
          function: {
            arguments: {
              query: 'vendor onboarding process'
            }
          }
        }]
      }
    })
  });
  
  const result2 = await response2.json();
  console.log('Result preview:', result2.results[0].result.substring(0, 200));
  
  const hasCorrectSteps2 = result2.results[0].result.includes('vendor risk assessment') 
    && result2.results[0].result.includes('W-9');
  
  console.log(hasCorrectSteps2 ? '✅ CORRECT - Still works' : '❌ WRONG - Regression!');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(hasCorrectSteps && hasCorrectSteps2 ? '\n🎉 FIX SUCCESSFUL - Both queries now work!' : '\n⚠️  Fix incomplete - needs more work');
})();

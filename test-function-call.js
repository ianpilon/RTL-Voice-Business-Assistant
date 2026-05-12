require('dotenv').config();
const fetch = require('node-fetch');

async function testFunctionCall() {
  console.log('\n🧪 TESTING FUNCTION CALL SIMULATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Simple format (what we expect)
  console.log('Test 1: Simple JSON format { query: "vendor onboarding" }');
  const test1 = await fetch('http://localhost:3001/search-policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'vendor onboarding' })
  });
  const result1 = await test1.json();
  console.log('Result:', result1.found ? '✅ SUCCESS' : '❌ FAILED');
  if (result1.found) {
    console.log('Content preview:', result1.content.substring(0, 200) + '...');
    console.log('Sources:', result1.sources);
  } else {
    console.log('Error:', result1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 2: Vapi format (nested in message object)
  console.log('Test 2: Vapi nested format (message.toolCalls[0].function.arguments.query)');
  const test2 = await fetch('http://localhost:3001/search-policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        toolCalls: [{
          function: {
            name: 'search_legal_policies',
            arguments: {
              query: 'vendor onboarding process'
            }
          }
        }]
      }
    })
  });
  const result2 = await test2.json();
  console.log('Result:', result2.found ? '✅ SUCCESS' : '❌ FAILED');
  if (result2.found) {
    console.log('Content preview:', result2.content.substring(0, 200) + '...');
    console.log('Sources:', result2.sources);
  } else {
    console.log('Error:', result2);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 3: Check what the correct answer should be
  console.log('✅ EXPECTED ANSWER:');
  console.log('Our vendor onboarding process has 5 steps:');
  console.log('1. Complete vendor risk assessment');
  console.log('2. Obtain W-9 or W-8 form');
  console.log('3. Legal review of vendor agreement');
  console.log('4. Information security review if handling data');
  console.log('5. Add to approved vendor list');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 4: Employee lookup test
  console.log('Test 3: Employee lookup for "Billy"');
  const test3 = await fetch('http://localhost:3001/lookup-employee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Billy' })
  });
  const result3 = await test3.json();
  console.log('Result:', result3.found ? '✅ SUCCESS' : '❌ FAILED');
  if (result3.found) {
    console.log('Employee:', result3.employee.name);
    console.log('Team:', result3.employee.team);
    console.log('Title:', result3.employee.title);
  } else {
    console.log('Error:', result3);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All tests completed!');
  console.log('If both format tests passed, the server is ready for Vapi calls.');
}

testFunctionCall().catch(console.error);

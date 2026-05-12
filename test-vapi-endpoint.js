const express = require('express');
const app = express();

app.use(express.json());

app.post('/search-policies', (req, res) => {
  console.log('\n🔍 VAPI FUNCTION CALL RECEIVED');
  console.log('Time:', new Date().toLocaleTimeString());
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  // Return exactly what Vapi expects
  res.json({
    result: "Our vendor onboarding process has 5 steps: 1. Complete vendor risk assessment, 2. Obtain W-9 or W-8 form, 3. Legal review of vendor agreement, 4. Information security review if handling data, 5. Add to approved vendor list."
  });
});

app.post('/lookup-employee', (req, res) => {
  console.log('\n👤 EMPLOYEE LOOKUP RECEIVED');
  console.log('Time:', new Date().toLocaleTimeString());
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  res.json({
    result: "Billy Johnson is on the Marketing team."
  });
});

const port = 3005;
app.listen(port, () => {
  console.log(`\n🧪 Test Vapi endpoint running on port ${port}`);
  console.log('Use: ngrok http 3005');
});

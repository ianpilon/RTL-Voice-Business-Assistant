require('dotenv').config();
const express = require('express');

const app = express();

// Add raw body parser to see exactly what Vapi sends
app.use(express.json());
app.use((req, res, next) => {
  console.log('\n' + '='.repeat(60));
  console.log(`📥 ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('='.repeat(60) + '\n');
  next();
});

app.post('/search-policies', (req, res) => {
  console.log('🔍 DEBUGGING search-policies endpoint');
  console.log('req.body:', req.body);
  console.log('req.body.query:', req.body.query);
  console.log('req.body type:', typeof req.body);
  console.log('All keys:', Object.keys(req.body));

  res.json({
    debug: {
      received_body: req.body,
      received_query: req.body.query,
      body_type: typeof req.body,
      all_keys: Object.keys(req.body)
    }
  });
});

const port = 3003;
app.listen(port, () => {
  console.log(`\n🔧 Debug server listening on port ${port}`);
  console.log('Test with ngrok: ngrok http 3003');
  console.log('Then update Vapi assistant to point to this debug server\n');
});

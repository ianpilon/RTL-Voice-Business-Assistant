require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

// You'll need to run this with your ngrok URL
const NGROK_URL = process.argv[2];

async function configureVapiWithRAG() {
  try {
    if (!NGROK_URL) {
      console.error('❌ Please provide your ngrok URL');
      console.error('Usage: node configure-vapi-rag.js https://your-ngrok-url.ngrok.app');
      console.error('\nFirst run: ngrok http 3001');
      return;
    }

    console.log('Configuring Vapi assistant to use local RAG system...\n');

    const systemPrompt = fs.readFileSync('./legal-services-prompt.txt', 'utf8');

    // Add RAG instructions to the prompt
    const ragPrompt = systemPrompt + `

---

## POLICY SEARCH CAPABILITY

You have access to a function called "search_legal_policies" that searches IOG's internal legal policy database.

**When to use it:**
- When a caller asks about specific policies, procedures, or compliance rules
- When you need to verify policy details before answering
- When the caller needs authoritative policy information

**How to use it:**
- Call the function with a clear, specific query about the policy topic
- The function will return relevant policy sections
- Use the returned information to answer the caller's question
- Always cite that the information comes from IOG policies

**Example queries:**
- "contract approval process for contracts over 100k"
- "data privacy requirements for customer data"
- "vendor onboarding requirements"
- "termination process requirements"

After receiving policy information, provide a clear, helpful answer to the caller and ask if they need clarification.
`;

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: {
          provider: "openai",
          model: "gpt-4",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: ragPrompt
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "search_legal_policies",
                description: "Searches IOG's internal legal policy database for relevant policies, procedures, and compliance rules. Use this when the caller asks about specific policies or when you need to verify policy information.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The search query describing what policy information is needed (e.g., 'contract approval process', 'data privacy requirements', 'vendor onboarding')"
                    }
                  },
                  required: ["query"]
                }
              },
              server: {
                url: `${NGROK_URL}/search-policies`,
                timeoutSeconds: 20
              }
            }
          ]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to configure assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Vapi assistant configured with local RAG!\n');
    console.log('Configuration:');
    console.log('  - Function: search_legal_policies');
    console.log('  - Server URL:', `${NGROK_URL}/search-policies`);
    console.log('\n🎉 Your assistant can now search your local legal policies!');
    console.log('\n📋 Next steps:');
    console.log('  1. Make sure your RAG server is running (npm start or node server-legal-rag.js)');
    console.log('  2. Make sure ngrok is running (ngrok http 3001)');
    console.log('  3. Add your legal documents to ./legal-docs/ directory');
    console.log('  4. Test by calling: +1 (716) 302-2410');

    // Save the ngrok URL for reference
    if (!fs.existsSync('.env')) {
      fs.writeFileSync('.env', '');
    }
    const envContent = fs.readFileSync('.env', 'utf8');
    if (!envContent.includes('NGROK_URL=')) {
      fs.appendFileSync('.env', `\nNGROK_URL=${NGROK_URL}\n`);
      console.log('\n✅ Saved NGROK_URL to .env file');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

configureVapiWithRAG();

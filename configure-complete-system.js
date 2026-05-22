require('dotenv').config();
const fs = require('fs');

// Defaults to the deployed Render URL; pass a different URL (e.g. an ngrok tunnel) for local dev.
const BACKEND_URL = process.argv[2] || 'https://rtl-procurement-mcp.onrender.com';

async function configureAssistant() {
  try {
    const systemPrompt = fs.readFileSync('./system-prompt.txt', 'utf8');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstMessage: "Hello, you've reached the RTL Business Assistant. How can I help you today?",
        model: {
          provider: "openai",
          model: "gpt-4",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: systemPrompt
            }
          ],
          tools: [
            {
              type: "function",
              async: false,
              function: {
                name: "lookup_asset",
                description: "Look up an RTL reefer trailer by its unit number to find out where it is and what it's doing right now. Returns status (in the yard, on the road, leased to a customer, or in the shop being serviced), current location, driver and load if on the road, lessee and lease end date if leased, mileage, and next service date. Use this whenever a caller asks about the location, status, driver, load, customer, or service status of a trailer.",
                parameters: {
                  type: "object",
                  properties: {
                    unit_number: {
                      type: "string",
                      description: "The trailer's unit number (e.g. RTL-1042, or just the digits like 1042)"
                    }
                  },
                  required: ["unit_number"]
                }
              },
              server: {
                url: `${BACKEND_URL}/lookup-asset`,
                timeoutSeconds: 45
              }
            },
            {
              type: "function",
              async: false,
              function: {
                name: "search_policies",
                description: "Search RTL's policies — payment terms, approval levels, vendor onboarding requirements, contract templates, CAD/HST, WSIB, insurance and refrigerant certification rules. ALWAYS use this for any policy, process, or procedure question rather than answering from general knowledge.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Search query for policies (e.g. 'upfront payment rules', 'vendor onboarding', 'trailer lease agreement template', 'WSIB requirement')"
                    }
                  },
                  required: ["query"]
                }
              },
              server: {
                url: `${BACKEND_URL}/search-policies`,
                timeoutSeconds: 45
              }
            },
            {
              type: "function",
              async: false,
              function: {
                name: "search_vendor_history",
                description: "Search RTL's approved vendor list by skill or past work. Returns vendors with their skills, past projects, average discount, and rating.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Search query for vendors (e.g. 'Carrier reefer repair', 'tire retreading', 'refrigerant handling', 'fleet telematics')"
                    }
                  },
                  required: ["query"]
                }
              },
              server: {
                url: `${BACKEND_URL}/search-vendors`,
                timeoutSeconds: 45
              }
            }
          ]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to configure assistant');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('RTL Business Assistant configured.');
    console.log('Backend:', BACKEND_URL);
    console.log('Tools wired: lookup_asset, search_policies, search_vendor_history');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

configureAssistant();

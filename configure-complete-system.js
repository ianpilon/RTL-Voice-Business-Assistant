require('dotenv').config();
const fs = require('fs');

// You'll need to provide your ngrok URL
const NGROK_URL = process.argv[2];

async function configureCompleteSystem() {
  try {
    if (!NGROK_URL) {
      console.error('❌ Please provide your ngrok URL');
      console.error('Usage: node configure-complete-system.js https://your-ngrok-url.ngrok.app');
      console.error('\nMake sure both servers are running:');
      console.error('  - RAG Server on port 3001');
      console.error('  - Employee Context Server on port 3002');
      console.error('\nThen run: ngrok http 3001 --domain=your-domain.ngrok.app');
      console.error('Or use ngrok config to forward multiple ports');
      return;
    }

    console.log('Configuring IOG Procurement Services AI with full context system...\n');

    const systemPrompt = fs.readFileSync('./procurement-services-prompt.txt', 'utf8');

    const response = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstMessage: "... Hello, you've reached the RTL Procurement Office. How can I help you today?",
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
            // Reefer Trailer / Asset Lookup Function
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
                url: `${NGROK_URL}/lookup-asset`,
                timeoutSeconds: 45
              }
            },
            // Procurement Policy Search Function
            {
              type: "function",
              async: false,
              function: {
                name: "search_procurement_policies",
                description: "Search IOG's procurement policies, procedures, contract templates, and approval workflows. ALWAYS use this for ANY question about procurement processes, payment terms, vendor onboarding, contract templates, or approval requirements.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Search query for procurement policies (e.g., 'vendor onboarding', 'fixed price contract template', 'payment term rules', 'contracts over 100k approval')"
                    }
                  },
                  required: ["query"]
                }
              },
              server: {
                url: `${NGROK_URL}/search-policies`,
                timeoutSeconds: 45
              }
            },
            // Vendor History Search Function
            {
              type: "function",
              async: false,
              function: {
                name: "search_vendor_history",
                description: "Search past vendor contracts and performance data. Use to find vendors by skills, past projects worked on, or to get vendor discount history and ratings.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Search query for vendors (e.g., 'Rust engineers', 'vendors who worked on Leos', 'marketing automation', 'TechForge discount history')"
                    }
                  },
                  required: ["query"]
                }
              },
              server: {
                url: `${NGROK_URL}/search-vendors`,
                timeoutSeconds: 45
              }
            },
            // Request Validation Function
            {
              type: "function",
              async: false,
              function: {
                name: "validate_request",
                description: "Validate that a procurement request has all required fields before submitting to the team. Use after gathering request details from caller to check completeness.",
                parameters: {
                  type: "object",
                  properties: {
                    budget_number: {
                      type: "string",
                      description: "Budget code or number for the request"
                    },
                    milestones: {
                      type: "string",
                      description: "Project milestones or timeline"
                    },
                    costs: {
                      type: "string",
                      description: "Cost breakdown or estimate"
                    },
                    description: {
                      type: "string",
                      description: "Brief description of what's being requested"
                    },
                    deadline: {
                      type: "string",
                      description: "Deadline or urgency level"
                    }
                  },
                  required: ["budget_number", "milestones", "costs", "description"]
                }
              },
              server: {
                url: `${NGROK_URL}/validate-request`,
                timeoutSeconds: 45
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

    console.log('✅ IOG Procurement Services AI fully configured!\n');
    console.log('Configuration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ Reefer Trailer Asset Lookup');
    console.log('    - Endpoint:', `${NGROK_URL}/lookup-asset`);
    console.log('    - Fleet: RTL-1001 through RTL-1015 (status, location, driver, lease, service)');
    console.log('');
    console.log('  ✓ Procurement Policy Search (RAG)');
    console.log('    - Endpoint:', `${NGROK_URL}/search-policies`);
    console.log('    - Documents: Vendor onboarding, contract templates, payment rules, FAQ');
    console.log('');
    console.log('  ✓ Vendor History Search');
    console.log('    - Endpoint:', `${NGROK_URL}/search-vendors`);
    console.log('    - Vendors: 12 approved vendors with skills & project history');
    console.log('');
    console.log('  ✓ Request Validation');
    console.log('    - Endpoint:', `${NGROK_URL}/validate-request`);
    console.log('    - Validates: Budget, milestones, costs, description');
    console.log('');
    console.log('🎉 Your Procurement AI can now:');
    console.log('   1. Validate procurement requests for completeness');
    console.log('   2. Find vendors by skills and past projects');
    console.log('   3. Answer policy questions (onboarding, templates, payment rules)');
    console.log('   4. Recognize internal team members');
    console.log('   5. Prevent 50% of incomplete requests from reaching Andrea\'s team');
    console.log('');
    console.log('📞 Test by calling your Vapi number');
    console.log('');
    console.log('💡 Try saying:');
    console.log('   "Do we have vendors who do Rust development?"');
    console.log('   → AI will search vendor database');
    console.log('');
    console.log('   "What\'s the vendor onboarding process?"');
    console.log('   → AI will search procurement policies');
    console.log('');
    console.log('   "I need to submit a procurement request"');
    console.log('   → AI will validate all required fields before submitting');
    console.log('');
    console.log('📊 Check health:');
    console.log('   curl http://localhost:3001/health');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

configureCompleteSystem();

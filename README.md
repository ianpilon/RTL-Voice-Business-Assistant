# RTL Voice Procurement System 🤖📞

An AI voice assistant for RTL's procurement team that reduces 50% of time wasted on incomplete requests and repetitive questions.

## What This Does

The system provides a voice AI assistant that internal departments can call to:
- **Submit validated procurement requests** - Ensures all required fields are collected before routing to Andrea's team
- **Search vendor database** - Find approved vendors by skills, past projects, or discount history
- **Answer policy questions** - Self-service answers about vendor onboarding, contract templates, payment rules, and timelines
- **Recognize team members** - Personalized service based on employee context

**Phone Number**: +1 (930) 254-9264

## Architecture

```
Caller → Vapi Platform → OpenAI GPT-4 → MCP Server (Port 3001) → Data Sources
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                            Employee Context    Procurement RAG
                            (5 employees)       (146 doc chunks)
                                    ↓                   ↓
                            Vendor Database     Policy Documents
                            (12 vendors)        (4 policy files)
```

## Core Components

### 1. Voice Interface (Vapi)
- Handles phone calls via +1 (930) 254-9264
- Natural language understanding with OpenAI GPT-4
- Custom greeting and conversation flow
- 4 custom function tools

### 2. MCP Server (Port 3001)
Unified Node.js/Express server providing:
- `/lookup-employee` - Employee context lookup
- `/search-policies` - RAG-based policy search
- `/search-vendors` - Vendor database search with scoring
- `/validate-request` - Request completeness validation

### 3. Data Sources
- **Employee Database**: 5 IOG team members with procurement history
- **Vendor Database**: 12 approved vendors with skills, projects, discounts
- **Policy Documents**: 4 comprehensive markdown files (vendor onboarding, contract templates, payment rules, FAQ)

## Prerequisites

- Node.js (v14 or higher)
- Vapi account with phone number
- OpenAI API key
- ngrok (for local development)

## Setup Instructions

### 1. Install Dependencies

```bash
cd procurement-voice-bot
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```
# Vapi AI Configuration
VAPI_API_KEY=your_vapi_api_key
VAPI_ASSISTANT_ID=your_assistant_id

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-key

# Server Configuration
PORT=3001
```

**Where to find these:**
- Vapi API Key: https://dashboard.vapi.ai/account
- OpenAI API key: https://platform.openai.com/api-keys

### 3. Start the MCP Server

```bash
node mcp-servers/unified-server.js
```

You should see:
```
🚀 IOG Procurement MCP Server running on port 3001

📊 System Status:
   ✓ 5 employees loaded
   ✓ 12 vendors loaded
   ✓ 146 procurement document chunks indexed

📡 Endpoints:
   POST /lookup-employee
   POST /search-policies
   POST /search-vendors
   POST /validate-request
   GET  /health
   POST /reload
```

### 4. Expose Server with ngrok

```bash
ngrok http 3001
```

This provides a public URL like: `https://your-subdomain.ngrok-free.app`

### 5. Configure Vapi Assistant

Run the configuration script with your ngrok URL:

```bash
node configure-complete-system.js https://your-subdomain.ngrok-free.app
```

This will:
- Update your Vapi assistant with the procurement system prompt
- Configure all 4 function tools to point to your ngrok endpoints
- Set the greeting message

### 6. Test It!

Call +1 (930) 254-9264 and try:
- "Do we have vendors who do Rust development?"
- "What's the vendor onboarding process?"
- "I need to submit a procurement request"

## How It Works

### Example 1: Vendor Search
```
Caller: "Do we have vendors who do Rust development?"
   ↓
Vapi → GPT-4 calls search_vendor_history("Rust development")
   ↓
MCP Server searches vendor database using keyword scoring
   ↓
Returns: TechForge Solutions (Leos, Cardano, 8% discount)
   ↓
AI responds: "Yes, we have 3 approved vendors with Rust expertise..."
```

### Example 2: Policy Question
```
Caller: "Can I pay a vendor 30% upfront?"
   ↓
Vapi → GPT-4 calls search_procurement_policies("upfront payment rules")
   ↓
MCP Server searches 146 document chunks using keyword matching
   ↓
Returns: "IOG policy caps upfront at 20%..."
   ↓
AI responds with policy explanation and alternatives
```

### Example 3: Request Submission
```
Caller: "I need to submit a procurement request"
   ↓
AI gathers: budget number, milestones, costs, description
   ↓
GPT-4 calls validate_request({...fields})
   ↓
MCP Server validates all required fields present
   ↓
If complete → "Perfect! I'll submit this to procurement..."
If incomplete → "I'm missing [fields]. Can you provide those?"
```

## Key Features

### Request Validation
Prevents the #1 problem: 50% of Andrea's team time wasted on incomplete requests
- Validates budget number, milestones, costs, description
- Provides friendly prompts for missing information
- Only routes complete requests to procurement team

### Vendor Search
Intelligent scoring algorithm across:
- Vendor name (10 points)
- Skills (5 points per keyword match)
- Past projects (3 points per keyword match)
- Returns top 5 vendors sorted by relevance

### Policy Search (RAG)
- 146 document chunks from 4 policy files
- Keyword-based scoring with TF-IDF-like approach
- Section-level chunking using markdown headers
- Returns top 5 most relevant sections

### Employee Context
- Recognizes 5 team members by name
- Personalized greetings and service
- Access to past procurement history

## System Prompt

The AI follows a comprehensive 3,800+ word system prompt located in `procurement-services-prompt.txt` that defines:
- Request validation flow (most critical)
- Self-service policy answers
- Vendor search procedures
- Call opening and graceful closing
- Professional boundaries
- Success criteria

## API Endpoints

### POST /lookup-employee
```json
{
  "name": "Andrea"
}
```
Returns employee details, department, title, procurement history

### POST /search-policies
```json
{
  "query": "vendor onboarding process"
}
```
Returns top 5 relevant policy document sections

### POST /search-vendors
```json
{
  "query": "Rust development"
}
```
Returns vendors ranked by skill/project relevance

### POST /validate-request
```json
{
  "budget_number": "BUD-2024-MKT-001",
  "milestones": "Q1 2025",
  "costs": "$50,000",
  "description": "Marketing automation platform"
}
```
Returns validation status with missing fields if incomplete

### GET /health
Returns system status with counts of employees, vendors, document chunks

## Data Management

### Adding Employees
Edit `mcp-servers/employee-context/employee-database.json`

### Adding Vendors
Edit `mcp-servers/vendor-context/vendor-database.json`

### Adding Policy Documents
Add markdown files to `mcp-servers/procurement-rag/procurement-docs/`
- Use markdown headers for section-based chunking
- Server automatically reloads on restart
- Or call POST /reload endpoint

## Production Deployment

For production use:
1. Deploy MCP server to cloud provider (Heroku, Railway, AWS, etc.)
2. Update Vapi assistant configuration with production URL
3. Set up monitoring and logging
4. Configure rate limiting
5. Add authentication for reload endpoint

## Monitoring

Check system health:
```bash
curl http://localhost:3001/health
```

Reload data without restart:
```bash
curl -X POST http://localhost:3001/reload
```

## Cost Considerations

- **Vapi Platform**: Variable based on minutes used
- **OpenAI GPT-4**: ~$0.03 per 1K tokens
- **ngrok**: Free tier available, paid for custom domains
- **Typical call**: ~$0.15-0.30 depending on length and function calls

## Security Notes

- `.env` file contains sensitive API keys - never commit to git
- `.env.backup` is in `.gitignore` to prevent accidental commits
- Use `.env.example` as template for sharing with team
- Rotate API keys regularly
- Add request validation in production
- Use HTTPS for all endpoints

## Troubleshooting

**Server won't start**
- Check port 3001 is available: `lsof -i :3001`
- Kill existing process: `lsof -ti:3001 | xargs kill -9`

**Functions not working on calls**
- Verify ngrok is running and URL is current
- Check configure-complete-system.js was run with correct URL
- Test endpoints directly: `curl -X POST http://localhost:3001/health`

**Policy search returning no results**
- Verify documents exist in `mcp-servers/procurement-rag/procurement-docs/`
- Check document chunks loaded: `curl http://localhost:3001/health`
- Try broader search terms

**Vendor search not finding matches**
- Check vendor database loaded: `curl http://localhost:3001/health`
- Search uses keyword matching - try different terms
- Verify vendor-database.json format is correct

## Future Enhancements

See `ARCHITECTURE.md` for detailed enhancement roadmap including:
- JIRA integration for automatic ticket creation
- Tract integration for vendor management
- Budget validation API
- Approval workflow automation
- Multi-language support
- Call analytics and insights

## Resources

- [Vapi Documentation](https://docs.vapi.ai)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Architecture Documentation](./ARCHITECTURE.md)

---

Built with Vapi and OpenAI

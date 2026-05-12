# Employee Context System Guide

## Overview

Your AI assistant now has **contextual awareness** of employees calling in. When someone says their name, the AI looks them up and knows their team, role, preferences, and history.

## Architecture

```
Caller: "Hi, this is Billy"
    ↓
AI calls: lookup_employee("Billy")
    ↓
Employee Context Server searches database
    ↓
Returns: Billy Johnson, Marketing team, Senior Marketing Manager
    ↓
AI responds: "Great! Hi Billy, I see you're on the Marketing team. How can I assist you today?"
```

## What's Running

1. **RAG Server** (Port 3001) - Searches legal policies
2. **Employee Context Server** (Port 3002) - Looks up employee data
3. **Vapi** - Calls both servers when needed

## Current Employees

### Billy Johnson
- **Team:** Marketing
- **Title:** Senior Marketing Manager
- **Style:** Direct and concise
- **Notes:** Needs quick turnaround on vendor contracts
- **History:** 1 prior contract review

### Bob Martinez
- **Team:** Design
- **Title:** Lead Product Designer
- **Style:** Visual examples helpful
- **Notes:** Works with external clients, needs NDAs reviewed quickly
- **History:** 2 prior legal interactions (IP, NDA)

### Sarah Chen
- **Team:** Marketing
- **Title:** VP of Marketing
- **Style:** Executive summary first
- **Notes:** High-level executive, deals with high-value contracts
- **History:** 1 major contract negotiation

## How to Add New Employees

### Method 1: API Call

```bash
curl -X POST http://localhost:3002/employee \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@iog.com",
    "team": "Engineering",
    "department": "Product Development",
    "title": "Senior Software Engineer",
    "location": "Remote",
    "manager": "Tech Lead Name",
    "projects": ["API Migration", "Security Audit"],
    "specialties": ["Backend Development", "API Design"],
    "preferences": {
      "communicationStyle": "Technical and detailed",
      "timezone": "PST",
      "urgentContactMethod": "Slack"
    },
    "notes": "Prefers technical explanations. Often needs IP guidance for open source."
  }'
```

### Method 2: Edit JSON Directly

Edit `employee-database.json` and add the employee object, then reload:

```bash
curl -X POST http://localhost:3002/reload
```

## How to Update Employee Info

```bash
curl -X PATCH http://localhost:3002/employee/emp001 \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated notes here",
    "projects": ["New Project"]
  }'
```

## How to Add Legal History

Track legal interactions automatically:

```bash
curl -X POST http://localhost:3002/employee/emp001/legal-history \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Contract Negotiation",
    "description": "Reviewed $250K vendor agreement"
  }'
```

## Employee Attributes You Can Track

### Basic Info
- name, firstName, lastName
- email, title, department, team
- location, manager

### Context
- **projects**: Current projects they're working on
- **specialties**: Their areas of expertise
- **directReports**: Team members they manage

### Legal History
- Past legal interactions
- Type of requests they usually make
- Patterns in their needs

### Preferences
- **communicationStyle**: How they like to communicate
- **timezone**: Their timezone
- **urgentContactMethod**: How to reach them urgently

### Notes
- Free-form notes about their needs
- Patterns you've noticed
- Special considerations

## API Endpoints

### GET /employees
List all employees

```bash
curl http://localhost:3002/employees
```

### GET /employee/:id
Get specific employee by ID

```bash
curl http://localhost:3002/employee/emp001
```

### POST /lookup-employee
Look up by name (what Vapi uses)

```bash
curl -X POST http://localhost:3002/lookup-employee \
  -H "Content-Type: application/json" \
  -d '{"name":"Billy"}'
```

### POST /employee
Add new employee (see example above)

### PATCH /employee/:id
Update employee attributes

### POST /employee/:id/legal-history
Add legal history entry

### GET /health
Check if server is running

```bash
curl http://localhost:3002/health
```

## How the AI Uses Context

When Billy calls and says his name:

1. **AI learns:**
   - He's Senior Marketing Manager
   - On Marketing team
   - Prefers direct, concise communication
   - Usually needs vendor contracts reviewed
   - Has used legal services before

2. **AI adjusts:**
   - Speaks in a direct, efficient manner
   - Anticipates he might need contract review
   - References his past interaction if relevant
   - Knows to provide written follow-up

3. **AI personalizes:**
   - "Hi Billy, I see you're on the Marketing team"
   - "Is this another vendor contract you need reviewed?"
   - Uses his communication style preferences

## Testing

Test the employee lookup:

```bash
# Test Billy lookup
curl -X POST http://localhost:3002/lookup-employee \
  -H "Content-Type: application/json" \
  -d '{"name":"Billy"}'

# Test Bob lookup
curl -X POST http://localhost:3002/lookup-employee \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob Martinez"}'

# Test unknown name
curl -X POST http://localhost:3002/lookup-employee \
  -H "Content-Type: application/json" \
  -d '{"name":"Unknown Person"}'
```

## Example Call Flow

**Caller:** "Hello?"

**AI:** "Hello, you've reached IOG in-house legal counsel. How can I help you today?"

**Caller:** "Hi, this is Billy."

**AI:** *(calls lookup_employee)* "Great! Hi Billy, I see you're on the Marketing team. How can I assist you today?"

**Caller:** "I need a vendor contract reviewed."

**AI:** *(uses context - knows Billy often needs quick turnaround on vendor contracts)* "Sure, I can help with that. What's the contract value and when do you need this completed?"

**Caller:** "About $50,000, and I need it by Friday."

**AI:** *(knows from policies that $10K-$100K requires VP approval and legal review)* "For a $50K contract, this requires VP approval and legal review with a 5 business day period. Given your Friday deadline, let me prioritize this for you. Can you email the contract to legal@iog.com with 'Billy - Vendor Contract - Urgent' in the subject line?"

## Scaling Tips

### For Large Organizations

1. **Import from HR system**: Write a script to sync from your HRIS
2. **Use database**: Replace JSON with PostgreSQL/MySQL
3. **Add authentication**: Secure the API endpoints
4. **Cache frequently accessed employees**: Speed up lookups
5. **Track analytics**: See which teams use legal most

### Privacy Considerations

- Only store business-relevant information
- Don't store sensitive personal data
- Implement access controls
- Log who accesses employee data
- Regular audits of stored information

## Troubleshooting

**"Employee not found"**
- Check spelling in employee database
- Try firstName only, lastName only, or full name
- Check employee-database.json file exists

**"Server not responding"**
- Verify server is running: `curl http://localhost:3002/health`
- Check port 3002 isn't in use
- Review server logs

**"Context not being used by AI"**
- Verify ngrok is forwarding to port 3002
- Check Vapi function configuration
- Test endpoint directly with curl
- Review Vapi call logs

## Next Steps

1. Add your real employees to the database
2. Test with actual names from your organization
3. Track legal interactions over time
4. Build reports on legal service usage by team
5. Integrate with your HRIS for automatic sync

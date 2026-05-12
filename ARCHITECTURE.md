# Procurement Voice AI - Architecture Documentation

## Overview

The Procurement Voice AI is an intelligent voice assistant designed for Input Output's procurement team. It handles incoming phone calls from internal departments, validates procurement requests, provides self-service answers about vendors and policies, and dramatically reduces the manual administrative burden on Andrea Smith's procurement team.

**Primary Goal**: Eliminate 50% of wasted time on incomplete requests and repetitive questions by validating requests and enabling self-service before routing to the human procurement team.

---

## Table of Contents

1. [System Architecture Diagram](#system-architecture-diagram)
2. [Component Overview](#component-overview)
3. [Data Flow](#data-flow)
4. [Core Functions](#core-functions)
5. [Technology Stack](#technology-stack)
6. [Data Models](#data-models)
7. [API Endpoints](#api-endpoints)
8. [Integration Points](#integration-points)
9. [Security & Privacy](#security--privacy)
10. [Scalability & Performance](#scalability--performance)
11. [Deployment Architecture](#deployment-architecture)
12. [Monitoring & Observability](#monitoring--observability)
13. [Future Enhancements](#future-enhancements)

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERNAL DEPARTMENT CALLER                        │
│                      (Marketing, Engineering, etc.)                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Phone Call
                             │ +1 (930) 254-9264
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         VAPI AI PLATFORM                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Voice Interface Layer                                        │   │
│  │ - Speech-to-Text (Deepgram)                                 │   │
│  │ - Text-to-Speech (PlayHT/ElevenLabs)                        │   │
│  │ - Call Management & Telephony                               │   │
│  │ - Session State Management                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ AI Model (OpenAI GPT-4)                                      │   │
│  │ - Temperature: 0.7                                           │   │
│  │ - System Prompt: procurement-services-prompt.txt             │   │
│  │ - First Message: "Hello, you've reached..."                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Function Calling Tools (4 functions)                         │   │
│  │ 1. lookup_employee(name)                                     │   │
│  │ 2. search_procurement_policies(query)                        │   │
│  │ 3. search_vendor_history(query)                              │   │
│  │ 4. validate_request(fields)                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────┬────────────┬────────────┬────────────┬──────────────┘
               │            │            │            │
               │ HTTPS      │ HTTPS      │ HTTPS      │ HTTPS
               ▼            ▼            ▼            ▼
         /lookup-emp  /search-pol  /search-ven  /validate-req
               │            │            │            │
               └────────────┴────────────┴────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NGROK TUNNEL                                  │
│         https://sprier-sulfurously-wendy.ngrok-free.dev             │
│                                                                      │
│  Purpose: Expose local development server to internet for Vapi      │
│  Routes all function calls to: localhost:3001                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              LOCAL MACHINE (Development Environment)                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │         UNIFIED MCP SERVER (Node.js + Express)                 │ │
│  │                    Port: 3001                                  │ │
│  │              File: mcp-servers/unified-server.js               │ │
│  │                                                                │ │
│  │  📋 Endpoints:                                                 │ │
│  │  • POST /lookup-employee    - Employee context lookup         │ │
│  │  • POST /search-policies    - Policy document RAG search      │ │
│  │  • POST /search-vendors     - Vendor database search          │ │
│  │  • POST /validate-request   - Request completeness check      │ │
│  │  • GET  /health             - Health check                    │ │
│  │  • POST /reload             - Reload all data sources         │ │
│  └────┬─────────────┬───────────────┬──────────────┬─────────────┘ │
│       │             │               │              │               │
│       ▼             ▼               ▼              ▼               │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐     │
│  │Employee │  │Procurement│  │  Vendor   │  │  Validation  │     │
│  │ Context │  │    RAG    │  │  Search   │  │    Logic     │     │
│  │ System  │  │  System   │  │  Engine   │  │              │     │
│  └────┬────┘  └─────┬────┘  └─────┬─────┘  └──────────────┘     │
│       │             │              │                               │
│       ▼             ▼              ▼                               │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐                        │
│  │employee-│  │procurement│  │vendor-    │                        │
│  │database │  │-docs/     │  │database   │                        │
│  │.json    │  │*.md files │  │.json      │                        │
│  │(5 emps) │  │(146 chunks│  │(12 vendors│                        │
│  └─────────┘  └──────────┘  └───────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Overview

### 1. Voice Interface Layer (Vapi)

**Purpose**: Handles all voice interaction, call management, and telephony infrastructure.

**Key Responsibilities**:
- Receive incoming phone calls
- Convert speech to text (STT) using Deepgram
- Send text to AI model for processing
- Convert AI responses to speech (TTS) using PlayHT
- Manage call state and session continuity
- Invoke backend functions via webhooks

**Configuration**:
- **Phone Number**: +1 (930) 254-9264
- **Assistant ID**: d42c88a5-1e26-40b9-8fbb-8f41e5b9a2fc
- **Model**: OpenAI GPT-4
- **Temperature**: 0.7 (balanced between consistency and natural variation)
- **First Message**: "... Hello, you've reached the Input Output Procurement Office. How can I help you today?"
  - Note: Leading "..." provides breathing space for smooth call connection

---

### 2. AI Processing Layer (OpenAI GPT-4)

**Purpose**: Natural language understanding, conversation management, and decision-making.

**System Prompt**: 3,800+ word prompt (`procurement-services-prompt.txt`) that defines:
- Core identity as procurement intake assistant
- Request validation requirements (budget, milestones, costs, description)
- Self-service policy and vendor search workflows
- When to use each of the 4 functions
- Tone and communication style
- Graceful call ending procedures

**Key Behaviors**:
1. **Validation-First Approach**: Never accepts incomplete procurement requests
2. **Self-Service Priority**: Answers policy/vendor questions without routing to team
3. **Conversational Collection**: Naturally gathers required fields through dialogue
4. **Function Orchestration**: Calls appropriate backend functions based on user needs

---

### 3. Unified MCP Server

**Purpose**: Central backend server that handles all business logic, data access, and function execution.

**Technology**:
- **Runtime**: Node.js (v14+)
- **Framework**: Express.js
- **Port**: 3001
- **File**: `mcp-servers/unified-server.js`

**Architecture Pattern**: Monolithic server with modular function handlers

**Startup Process**:
1. Load employee database from JSON
2. Load vendor database from JSON
3. Load and chunk procurement policy documents
4. Start Express server on port 3001
5. Log startup status (employees, vendors, documents loaded)

---

### 4. Employee Context System

**Purpose**: Provide personalized responses by recognizing employees and their context.

**Data Source**: `mcp-servers/employee-context/employee-database.json`

**Schema**:
```json
{
  "employees": [
    {
      "id": "emp001",
      "name": "Andrea Smith",
      "firstName": "Andrea",
      "lastName": "Jorgensen",
      "email": "andrea.smith@iog.com",
      "team": "Procurement",
      "department": "Procurement & Vendor Management",
      "title": "Procurement Manager",
      "location": "Corporate Office",
      "manager": "CFO",
      "directReports": ["Maria Santos", "James Chen"],
      "projects": [...],
      "specialties": [...],
      "procurementHistory": [...],
      "preferences": {
        "communicationStyle": "Direct and efficient",
        "timezone": "PST",
        "urgentContactMethod": "Slack then email"
      },
      "notes": "..."
    }
  ]
}
```

**Search Algorithm**:
1. Exact match on full name, first name, or last name
2. Fuzzy match (partial string matching) if exact match fails
3. Case-insensitive comparison

**Current Data**: 5 employees
- 3 procurement team members (Andrea, Maria, James)
- 2 frequent requesters (Sarah Mitchell - Engineering, Tom Harrison - Marketing)

---

### 5. Procurement RAG (Retrieval Augmented Generation) System

**Purpose**: Enable AI to answer policy questions using organization's internal documentation.

**Data Source**: `mcp-servers/procurement-rag/procurement-docs/`

**Document Library** (4 comprehensive guides):
1. **vendor-onboarding.md**: 7-step onboarding process, timelines, risk assessment
2. **contract-templates.md**: Template selection guide, approval thresholds, payment terms
3. **payment-rules.md**: Net 30 terms, upfront limits, balloon payments, NTE caps
4. **procurement-faq.md**: Common questions, contact info, self-service guidance

**Document Processing Pipeline**:

**Step 1: Loading**
- Scan directory for `.txt` and `.md` files
- Read file contents

**Step 2: Chunking** (Section-based, not arbitrary)
- Split on `##` markdown headers (main sections)
- Further split on `###` headers (subsections)
- Maintain semantic boundaries (prevents mixing unrelated content)
- Store each chunk with metadata (file, section ID)

**Step 3: Indexing**
- Create in-memory array of document chunks
- Total: 146 chunks across 4 documents

**Search Algorithm**:
```javascript
function searchDocuments(query) {
  // 1. Extract keywords (words > 3 characters)
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  
  // 2. Score each document chunk
  documents.map(doc => {
    let score = 0;
    
    // Count keyword matches in content (+1 per match)
    keywords.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      score += matches;
    });
    
    // Boost if keyword in first line (+5)
    if (firstLine.includes(keyword)) score += 5;
    
    // Boost if keyword in section header (+10)
    if (firstLine.startsWith('##') && firstLine.includes(keyword)) score += 10;
    
    // Penalize very short chunks (×0.5)
    if (doc.content.length < 100) score *= 0.5;
    
    return { ...doc, score };
  })
  
  // 3. Filter, sort, return top 3
  .filter(doc => doc.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);
}
```

**Why This Approach?**:
- **Simple & Fast**: No vector embeddings, no external DB, sub-100ms response
- **Accurate**: Section-based chunking preserves context
- **Transparent**: Scoring logic is debuggable and adjustable
- **Cost-Effective**: No embedding API costs

---

### 6. Vendor Search Engine

**Purpose**: Find approved vendors by skills, past projects, or get vendor performance data.

**Data Source**: `mcp-servers/vendor-context/vendor-database.json`

**Schema**:
```json
{
  "vendors": [
    {
      "id": "vendor001",
      "name": "TechForge Solutions",
      "skills": ["Rust engineers", "Blockchain development", ...],
      "pastProjects": ["Leos", "Cardano integration", ...],
      "averageDiscount": "8%",
      "contracts": [
        {
          "date": "2024-05-15",
          "value": "$180,000",
          "type": "Fixed price",
          "project": "Leos backend development",
          "duration": "6 months"
        }
      ],
      "contactInfo": {...},
      "status": "approved",
      "notes": "...",
      "rating": "4.8/5"
    }
  ]
}
```

**Current Data**: 12 approved vendors across diverse skills
- **Blockchain/Rust**: TechForge Solutions, Quantum Rust Labs
- **Infrastructure**: CloudScale Engineering
- **Marketing**: Creative Bloom Agency, AutomateFlow Systems, Global Content Collective
- **Development**: Nexus Software Group, FrontEnd Masters
- **Specialized**: SecureChain Auditors, DataFlow Analytics, BrandWorks Studio, TestPro QA

**Search Algorithm**:
```javascript
function searchVendors(query) {
  // 1. Score each vendor
  vendors.map(vendor => {
    let score = 0;
    
    // Vendor name match (+10)
    if (vendor.name.toLowerCase().includes(query)) score += 10;
    
    // Skills match (+5 per keyword match)
    vendor.skills.forEach(skill => {
      keywords.forEach(keyword => {
        if (skill.toLowerCase().includes(keyword)) score += 5;
      });
    });
    
    // Past projects match (+3 per keyword match)
    vendor.pastProjects.forEach(project => {
      keywords.forEach(keyword => {
        if (project.toLowerCase().includes(keyword)) score += 3;
      });
    });
    
    return { ...vendor, score };
  })
  
  // 2. Filter, sort, return top 5
  .filter(v => v.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);
}
```

**Example Queries**:
- "Rust engineers" → Returns TechForge, Quantum Rust Labs
- "marketing automation" → Returns Creative Bloom, AutomateFlow
- "vendors who worked on Leos" → Returns TechForge, CloudScale, Quantum Rust

---

### 7. Request Validation System

**Purpose**: Prevent incomplete procurement requests from reaching Andrea's team (the #1 problem).

**Validation Logic**:
```javascript
function validateProcurementRequest(fields) {
  const missing = [];
  const warnings = [];
  
  // Required fields (MUST have)
  if (!fields.budget_number) missing.push("budget number");
  if (!fields.milestones) missing.push("milestones");
  if (!fields.costs) missing.push("cost breakdown");
  if (!fields.description) missing.push("project description");
  
  // Optional but recommended
  if (!fields.deadline) warnings.push("deadline or timeline");
  
  return { missing, warnings };
}
```

**Response Format**:
- **Incomplete**: "Missing required fields: [list]. Please provide these before I can submit your request."
- **Complete**: "All required fields are present! Your request is ready to submit."
- **Complete with warnings**: "All required fields present! Note: Consider adding: [warnings]."

**Impact**: Blocks 100% of incomplete requests before they reach procurement team, saving 3-5 days of back-and-forth per request.

---

## Data Flow

### Scenario 1: Policy Question (Self-Service)

```
1. User calls: +1 (930) 254-9264
   ↓
2. Vapi answers: "Hello, you've reached the Input Output Procurement Office..."
   ↓
3. User: "What's the vendor onboarding process?"
   ↓
4. Vapi → STT → GPT-4
   ↓
5. GPT-4 decides: Use search_procurement_policies()
   ↓
6. Vapi → Webhook → POST https://[ngrok]/search-policies
   Request body:
   {
     "message": {
       "toolCallList": [{
         "id": "call_abc123",
         "function": {
           "arguments": { "query": "vendor onboarding process" }
         }
       }]
     }
   }
   ↓
7. Ngrok → localhost:3001/search-policies
   ↓
8. Unified Server:
   - Extract query: "vendor onboarding process"
   - Call searchDocuments("vendor onboarding process")
   - Find top 3 matching document chunks
   - Combine into single text response
   ↓
9. Response to Vapi:
   {
     "results": [{
       "toolCallId": "call_abc123",
       "result": "## Step 1: Initial Vendor Assessment\nBefore engaging..."
     }]
   }
   ↓
10. GPT-4 receives result, formats naturally:
    "The vendor onboarding process has 7 steps. First, you'll need to..."
    ↓
11. Vapi → TTS → User hears response
    ↓
12. Continue conversation or end call

Total time: ~2-3 seconds
Result: User got answer WITHOUT involving procurement team ✅
```

---

### Scenario 2: Vendor Search

```
1. User: "Do we have vendors who do Rust development?"
   ↓
2. GPT-4 → search_vendor_history("Rust development")
   ↓
3. Unified Server:
   - searchVendors("Rust development")
   - Scores: TechForge (15 points), Quantum Rust Labs (13 points)
   - Returns top 2 vendors with details
   ↓
4. Response:
   "TechForge Solutions: Rust engineers, Blockchain development... 
    Past projects: Leos, Cardano. Average discount: 8%. Rating: 4.8/5.
    Quantum Rust Labs: Rust engineers, Systems programming...
    Past projects: Leos, Performance optimization. Average discount: 9%. Rating: 4.9/5."
   ↓
5. GPT-4 formats naturally:
   "Yes, we have 2 approved vendors with Rust expertise. TechForge Solutions 
    has worked on Leos and Cardano projects with an 8% average discount and 
    4.8/5 rating. Quantum Rust Labs specializes in Rust with a 9% discount 
    and 4.9/5 rating. Would you like their contact information?"
   ↓
6. User receives personalized vendor recommendations ✅
```

---

### Scenario 3: Request Submission (Validation)

```
1. User: "I need to submit a procurement request"
   ↓
2. GPT-4: Begins gathering required fields
   "I can help with that! To submit your request, I'll need a few details.
    First, what's your budget number?"
   ↓
3. User: "BUD-2024-MKT-001"
   GPT-4: "Great. What are the key milestones?"
   ↓
4. User: "Q1 and Q2 2025"
   GPT-4: "And what's the estimated cost?"
   ↓
5. User: "$75,000"
   GPT-4: "What are you procuring and why?"
   ↓
6. User: "Marketing automation software for campaign management"
   ↓
7. GPT-4 → validate_request({
     budget_number: "BUD-2024-MKT-001",
     milestones: "Q1 and Q2 2025",
     costs: "$75,000",
     description: "Marketing automation software for campaign management"
   })
   ↓
8. Unified Server validates:
   - budget_number: ✅ present
   - milestones: ✅ present
   - costs: ✅ present
   - description: ✅ present
   - deadline: ⚠️ optional (warning)
   ↓
9. Response: "All required fields are present! Your request is ready to submit.
              Note: Consider adding: deadline or timeline."
   ↓
10. GPT-4: "Perfect! I have everything needed: budget BUD-2024-MKT-001, 
            milestones Q1 and Q2, $75K for marketing automation. I'll submit 
            this to the procurement team. For a $75K request, expect 10-15 
            business days. You'll receive a confirmation email shortly."
    ↓
11. Request submitted with ALL required fields ✅
    No back-and-forth needed ✅
    Saves 3-5 days ✅
```

---

## Core Functions

### Function 1: `lookup_employee(name)`

**Purpose**: Retrieve employee context for personalization

**Parameters**:
- `name` (string, required): First name, last name, or full name

**Returns**: Formatted employee context string

**Example**:
```
Input: { name: "Andrea" }

Output: "Employee found: Andrea Smith, Procurement Manager in Procurement & 
         Vendor Management. Team: Procurement. Focused on reducing manual admin 
         work. Prefers validated, complete requests only. Communication style: 
         Direct and efficient."
```

**Use Cases**:
- Caller mentions their name: "Hi, this is Andrea"
- AI personalizes response based on department/preferences
- Reference past interactions

**Vapi Configuration**:
```javascript
{
  type: "function",
  async: false,
  function: {
    name: "lookup_employee",
    description: "Look up an IOG employee by name to get their department, team, role, and past procurement interactions.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Employee's name (first, last, or full)" }
      },
      required: ["name"]
    }
  },
  server: {
    url: "https://[ngrok-url]/lookup-employee",
    timeoutSeconds: 10
  }
}
```

---

### Function 2: `search_procurement_policies(query)`

**Purpose**: Answer policy questions using RAG over internal documentation

**Parameters**:
- `query` (string, required): What policy information is needed

**Returns**: Combined text from top 3 matching document sections

**Example**:
```
Input: { query: "vendor onboarding process" }

Output: "## Step 1: Initial Vendor Assessment\nBefore engaging a new vendor, 
         the requesting department must provide: Vendor name and contact 
         information, Description of services... [continues with full process]"
```

**Use Cases**:
- "What's the vendor onboarding process?"
- "Which contract template should I use?"
- "Can I pay more than 20% upfront?"
- "What are the payment term rules?"
- "How long does procurement take?"

**Vapi Configuration**:
```javascript
{
  type: "function",
  async: false,
  function: {
    name: "search_procurement_policies",
    description: "Search IOG's procurement policies, procedures, contract templates, and approval workflows. ALWAYS use this for ANY question about procurement processes.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for procurement policies" }
      },
      required: ["query"]
    }
  },
  server: {
    url: "https://[ngrok-url]/search-policies",
    timeoutSeconds: 20
  }
}
```

---

### Function 3: `search_vendor_history(query)`

**Purpose**: Find vendors by skills, past projects, or get vendor performance data

**Parameters**:
- `query` (string, required): Vendor search criteria

**Returns**: Details for top 5 matching vendors

**Example**:
```
Input: { query: "Rust engineers" }

Output: "TechForge Solutions: Rust engineers, Blockchain development, Smart contracts, 
         Backend engineering. Past projects: Leos, Cardano integration, Wallet 
         infrastructure. Average discount: 8%. Rating: 4.8/5. Quantum Rust Labs: 
         Rust engineers, Systems programming... Rating: 4.9/5."
```

**Use Cases**:
- "Do we have vendors who do [skill]?"
- "Which vendors worked on [project]?"
- "I need vendors with [technology] experience"
- "What's [vendor name]'s discount history?"

**Vapi Configuration**:
```javascript
{
  type: "function",
  async: false,
  function: {
    name: "search_vendor_history",
    description: "Search past vendor contracts and performance data. Use to find vendors by skills, past projects, or discount history.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for vendors" }
      },
      required: ["query"]
    }
  },
  server: {
    url: "https://[ngrok-url]/search-vendors",
    timeoutSeconds: 15
  }
}
```

---

### Function 4: `validate_request(fields)`

**Purpose**: Check procurement request completeness before submission

**Parameters**:
- `budget_number` (string, required): Budget code
- `milestones` (string, required): Project phases/timeline
- `costs` (string, required): Cost breakdown
- `description` (string, required): What's being procured
- `deadline` (string, optional): When needed

**Returns**: Validation result with missing fields or confirmation

**Example 1 (Incomplete)**:
```
Input: { 
  description: "Software"
}

Output: "Missing required fields: budget number, milestones, cost breakdown. 
         Please provide these before I can submit your request."
```

**Example 2 (Complete)**:
```
Input: { 
  budget_number: "BUD-2024-001",
  milestones: "Q1, Q2",
  costs: "$50,000",
  description: "Marketing automation software"
}

Output: "All required fields are present! Your request is ready to submit. 
         Note: Consider adding: deadline or timeline."
```

**Use Cases**:
- After gathering request details from caller
- Before saying "I'll submit this to procurement"
- Prevents incomplete submissions (the #1 problem)

**Vapi Configuration**:
```javascript
{
  type: "function",
  async: false,
  function: {
    name: "validate_request",
    description: "Validate that a procurement request has all required fields before submitting to the team.",
    parameters: {
      type: "object",
      properties: {
        budget_number: { type: "string", description: "Budget code" },
        milestones: { type: "string", description: "Project milestones" },
        costs: { type: "string", description: "Cost breakdown" },
        description: { type: "string", description: "What's being requested" },
        deadline: { type: "string", description: "Deadline or urgency" }
      },
      required: ["budget_number", "milestones", "costs", "description"]
    }
  },
  server: {
    url: "https://[ngrok-url]/validate-request",
    timeoutSeconds: 10
  }
}
```

---

## Technology Stack

### Frontend/Interface
- **Voice Interface**: Vapi.ai
  - Speech-to-Text: Deepgram
  - Text-to-Speech: PlayHT / ElevenLabs
  - Telephony: Vapi-managed PSTN

### Backend
- **Runtime**: Node.js v14+
- **Framework**: Express.js 4.18.2
- **Language**: JavaScript (ES6+)

### AI/ML
- **LLM**: OpenAI GPT-4 (via Vapi)
- **RAG Approach**: Keyword-based search (no embeddings)
- **Temperature**: 0.7

### Data Storage
- **Employee DB**: JSON file (5 records)
- **Vendor DB**: JSON file (12 records)
- **Policy Docs**: Markdown files (146 chunks)
- **In-Memory**: All data loaded at startup for fast access

### Networking
- **Tunnel**: Ngrok (development)
- **Protocol**: HTTPS
- **API Format**: JSON (Vapi webhook format)

### Development Tools
- **Package Manager**: npm
- **Environment**: dotenv for configuration
- **Version Control**: Git (assumed)

### Dependencies
```json
{
  "dependencies": {
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "axios": "^1.13.2",
    "openai": "^4.20.0"
  }
}
```

---

## Data Models

### Employee Model
```typescript
interface Employee {
  id: string;                      // Unique identifier
  name: string;                    // Full name
  firstName: string;               // First name
  lastName: string;                // Last name
  email: string;                   // Email address
  team: string;                    // Team name (e.g., "Procurement")
  department: string;              // Department name
  title: string;                   // Job title
  location: string;                // Office location
  manager: string;                 // Manager name
  directReports: string[];         // List of direct reports
  projects: string[];              // Current projects
  specialties: string[];           // Areas of expertise
  procurementHistory: Array<{      // Past procurement interactions
    date: string;
    type: string;
    description: string;
  }>;
  preferences: {
    communicationStyle: string;    // How they prefer to communicate
    timezone: string;              // Timezone
    urgentContactMethod: string;   // How to reach urgently
  };
  notes: string;                   // Additional context
}
```

### Vendor Model
```typescript
interface Vendor {
  id: string;                      // Unique identifier
  name: string;                    // Vendor name
  skills: string[];                // List of skills/capabilities
  pastProjects: string[];          // Projects worked on
  averageDiscount: string;         // Average discount percentage
  contracts: Array<{               // Contract history
    date: string;                  // Contract date
    value: string;                 // Contract value
    type: string;                  // Contract type
    project: string;               // Project name
    duration: string;              // Contract duration
  }>;
  contactInfo: {
    email: string;
    phone: string;
    website: string;
  };
  status: string;                  // "approved" | "pending" | "inactive"
  notes: string;                   // Additional notes
  rating: string;                  // Vendor rating (e.g., "4.8/5")
}
```

### Document Chunk Model
```typescript
interface DocumentChunk {
  id: string;                      // Unique chunk ID
  filename: string;                // Source file name
  content: string;                 // Chunk content (section text)
  score?: number;                  // Search relevance score (computed)
}
```

### Validation Result Model
```typescript
interface ValidationResult {
  missing: string[];               // List of missing required fields
  warnings: string[];              // List of optional but recommended fields
}
```

---

## API Endpoints

### POST `/lookup-employee`

**Purpose**: Retrieve employee context by name

**Request Format** (Vapi webhook):
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_abc123",
      "function": {
        "arguments": {
          "name": "Andrea"
        }
      }
    }]
  }
}
```

**Response Format**:
```json
{
  "results": [{
    "toolCallId": "call_abc123",
    "result": "Employee found: Andrea Smith, Procurement Manager..."
  }]
}
```

**Error Handling**:
- Missing name: Returns error message
- Employee not found: Returns "I don't have information for [name]"

**Performance**: ~50ms average response time

---

### POST `/search-policies`

**Purpose**: Search procurement policy documents

**Request Format**:
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_xyz789",
      "function": {
        "arguments": {
          "query": "vendor onboarding process"
        }
      }
    }]
  }
}
```

**Response Format**:
```json
{
  "results": [{
    "toolCallId": "call_xyz789",
    "result": "## Step 1: Initial Vendor Assessment\nBefore engaging..."
  }]
}
```

**Error Handling**:
- Missing query: Returns error message
- No results found: Returns "No relevant policies found..."

**Performance**: ~100-200ms (depends on document corpus size)

---

### POST `/search-vendors`

**Purpose**: Search vendor database by skills or projects

**Request Format**:
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_def456",
      "function": {
        "arguments": {
          "query": "Rust engineers"
        }
      }
    }]
  }
}
```

**Response Format**:
```json
{
  "results": [{
    "toolCallId": "call_def456",
    "result": "TechForge Solutions: Rust engineers, Blockchain... Rating: 4.8/5. Quantum Rust Labs:..."
  }]
}
```

**Error Handling**:
- Missing query: Returns error message
- No vendors found: Returns "No vendors found matching that criteria..."

**Performance**: ~50-100ms

---

### POST `/validate-request`

**Purpose**: Validate procurement request completeness

**Request Format**:
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_ghi789",
      "function": {
        "arguments": {
          "budget_number": "BUD-2024-001",
          "milestones": "Q1, Q2",
          "costs": "$50,000",
          "description": "Marketing software"
        }
      }
    }]
  }
}
```

**Response Format (Complete)**:
```json
{
  "results": [{
    "toolCallId": "call_ghi789",
    "result": "All required fields are present! Your request is ready to submit."
  }]
}
```

**Response Format (Incomplete)**:
```json
{
  "results": [{
    "toolCallId": "call_ghi789",
    "result": "Missing required fields: budget number, milestones. Please provide these..."
  }]
}
```

**Performance**: ~10-20ms (simple validation logic)

---

### GET `/health`

**Purpose**: Health check endpoint for monitoring

**Request**: None (GET request)

**Response**:
```json
{
  "status": "ok",
  "employees": 5,
  "documents": 146,
  "vendors": 12,
  "message": "Procurement MCP server is running"
}
```

**Use Cases**:
- Monitoring system health
- Verifying data loaded correctly
- Debugging startup issues

---

### POST `/reload`

**Purpose**: Reload all data sources without restarting server

**Request**: Empty POST

**Response**:
```json
{
  "success": true,
  "employees": 5,
  "documents": 146,
  "vendors": 12,
  "message": "All data reloaded"
}
```

**Use Cases**:
- After updating employee database
- After adding new policy documents
- After adding new vendors
- Hot-reload without downtime

---

## Integration Points

### 1. Vapi Platform Integration

**Connection Method**: Webhooks (HTTP POST)

**Webhook Format**: Vapi-specific JSON structure
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_id",
      "function": {
        "name": "function_name",
        "arguments": { ... }
      }
    }]
  }
}
```

**Required Response Format**:
```json
{
  "results": [{
    "toolCallId": "call_id",
    "result": "single-line text response"
  }]
}
```

**Configuration Method**: API call to Vapi
- File: `configure-complete-system.js`
- Updates: Assistant configuration, function definitions, system prompt
- Requires: VAPI_API_KEY, VAPI_ASSISTANT_ID

---

### 2. Ngrok Tunnel Integration

**Purpose**: Expose local development server to internet

**Configuration**:
```bash
ngrok http 3001 --domain=sprier-sulfurously-wendy.ngrok-free.dev
```

**URL Format**: `https://[subdomain].ngrok-free.dev`

**Routes**:
- All function webhooks → `https://[ngrok-url]/[endpoint]`
- Forwards to → `localhost:3001/[endpoint]`

**Production Alternative**: Replace with:
- Cloud hosting (AWS, GCP, Azure)
- Kubernetes cluster
- Serverless functions (AWS Lambda, Vercel)

---

### 3. OpenAI Integration (via Vapi)

**Model**: GPT-4
**Provider**: Vapi handles API calls
**Configuration**: Temperature 0.7, system prompt injection

**No direct integration** - Vapi manages all OpenAI communication

---

## Security & Privacy

### Data Privacy

**Employee Data**:
- Stored locally only (JSON file)
- Not sent to external services except Vapi (for function results)
- No PII exposed in logs

**Vendor Data**:
- Approved vendors only
- No sensitive contract terms in database
- Contact info limited to business emails

**Policy Documents**:
- Internal-only information
- Not publicly accessible
- Served only through authenticated function calls

### API Security

**Current State (Development)**:
- No authentication on endpoints (local-only via ngrok)
- Ngrok provides HTTPS encryption

**Production Recommendations**:
1. **Add API Key Authentication**:
   ```javascript
   app.use((req, res, next) => {
     const apiKey = req.headers['x-api-key'];
     if (apiKey !== process.env.API_KEY) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   });
   ```

2. **Validate Vapi Webhook Signatures**:
   - Verify requests actually come from Vapi
   - Implement HMAC signature validation

3. **Rate Limiting**:
   ```javascript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
     windowMs: 1 * 60 * 1000, // 1 minute
     max: 100 // limit each IP to 100 requests per minute
   });
   app.use(limiter);
   ```

4. **Input Sanitization**:
   - Validate all function parameters
   - Prevent injection attacks

### Environment Variables

**Sensitive Data in `.env`**:
- VAPI_API_KEY
- VAPI_ASSISTANT_ID
- OPENAI_API_KEY (if direct integration)

**Best Practices**:
- `.env` file in `.gitignore`
- Never commit secrets to version control
- Use secret management in production (AWS Secrets Manager, etc.)

### Compliance Considerations

**Data Retention**:
- Vapi may log call transcripts (check Vapi settings)
- Local server doesn't persist call data
- Consider GDPR/CCPA implications for EU/CA callers

**Attorney-Client Privilege**:
- Not applicable (this is procurement, not legal)
- Still maintain confidentiality of internal information

---

## Scalability & Performance

### Current Performance Metrics

**Response Times**:
- Employee lookup: ~50ms
- Policy search: ~100-200ms
- Vendor search: ~50-100ms
- Request validation: ~10-20ms
- Total function call (including network): <2 seconds

**Throughput**:
- Current: Single server, handles ~100 concurrent calls
- Bottleneck: Node.js single-threaded nature

### Scalability Constraints

**Current Architecture Limitations**:
1. **In-Memory Data**: All data loaded at startup
   - Memory usage: ~10MB (current dataset)
   - Scales linearly with data size
   
2. **Single Server**: No load balancing
   - If server crashes, service is down
   
3. **File-Based Storage**: Not optimized for write operations
   - Adding vendors/employees requires restart or reload

### Scaling Strategies

**Horizontal Scaling** (Recommended for production):
```
┌──────────────────┐
│   Load Balancer  │
│    (Nginx/ALB)   │
└────────┬─────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Server 1│ │Server 2│ │Server 3│ │Server N│
│Port    │ │Port    │ │Port    │ │Port    │
│3001    │ │3002    │ │3003    │ │300N    │
└────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
     │          │           │          │
     └──────────┴───────────┴──────────┘
                │
        ┌───────▼────────┐
        │  Shared Cache  │
        │     (Redis)    │
        └────────────────┘
```

**Database Migration** (For larger datasets):
- Move from JSON files to PostgreSQL or MongoDB
- Add indexing for faster searches
- Enable real-time data updates

**Caching Layer** (For frequently accessed data):
```javascript
const redis = require('redis');
const client = redis.createClient();

async function searchPolicies(query) {
  // Check cache first
  const cached = await client.get(`policy:${query}`);
  if (cached) return JSON.parse(cached);
  
  // If not cached, search and cache result
  const result = searchDocuments(query);
  await client.setEx(`policy:${query}`, 3600, JSON.stringify(result));
  return result;
}
```

**CDN for Static Assets** (If adding web interface):
- Serve policy documents via CDN
- Reduce server load

### Performance Optimization Opportunities

1. **Vector Search** (Replace keyword search):
   - Pre-compute embeddings for all documents
   - Use vector database (Pinecone, Weaviate)
   - Improve search accuracy and speed

2. **Query Optimization**:
   - Memoize frequent searches
   - Pre-compute common vendor queries
   - Index documents by keywords

3. **Compression**:
   - Gzip HTTP responses
   - Reduce payload sizes

---

## Deployment Architecture

### Development Environment (Current)

```
┌────────────────────────────────────────────┐
│         Developer Machine                   │
│  ┌──────────────────────────────────────┐  │
│  │  Terminal 1: Server                  │  │
│  │  $ cd mcp-servers                    │  │
│  │  $ node unified-server.js            │  │
│  │  Port: 3001                          │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Terminal 2: Ngrok                   │  │
│  │  $ ngrok http 3001                   │  │
│  │  URL: https://[random].ngrok.dev     │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
                    │
                    │ HTTPS
                    ▼
          ┌──────────────────┐
          │   Vapi Platform   │
          │  (Cloud Hosted)   │
          └──────────────────┘
```

**Pros**:
- Fast iteration during development
- Easy debugging with local logs
- No deployment overhead

**Cons**:
- Not suitable for production
- Ngrok URL changes periodically
- Single point of failure
- Developer machine must stay running

---

### Production Environment (Recommended)

**Option 1: Traditional Server Deployment**

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS/GCP/Azure                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               Load Balancer (ALB/ELB)                   │ │
│  │           https://procurement-api.iog.com              │ │
│  └───────┬────────────────────────────────┬───────────────┘ │
│          │                                │                 │
│  ┌───────▼────────┐              ┌────────▼──────────┐     │
│  │   EC2 Instance  │              │   EC2 Instance    │     │
│  │   (Primary)     │              │   (Replica)       │     │
│  │   Node.js       │              │   Node.js         │     │
│  │   Port 3001     │              │   Port 3001       │     │
│  └───────┬────────┘              └────────┬──────────┘     │
│          │                                │                 │
│          └────────────┬───────────────────┘                 │
│                       │                                     │
│               ┌───────▼────────┐                            │
│               │      RDS        │                            │
│               │   (PostgreSQL)  │                            │
│               │  Employee/Vendor│                            │
│               │     Database    │                            │
│               └────────────────┘                            │
│                                                             │
│               ┌────────────────┐                            │
│               │       S3        │                            │
│               │  Policy Docs    │                            │
│               └────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Setup Steps**:
1. Provision 2+ EC2 instances
2. Install Node.js and dependencies
3. Configure load balancer
4. Set up RDS for data storage
5. Store policy docs in S3
6. Configure environment variables
7. Set up CloudWatch monitoring
8. Configure auto-scaling

**Pros**:
- High availability (multiple servers)
- Auto-scaling based on load
- Persistent data storage
- Professional monitoring

**Cons**:
- Higher cost (~$100-300/month)
- More complex setup
- Requires DevOps knowledge

---

**Option 2: Serverless Deployment**

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Lambda                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               API Gateway                               │ │
│  │           https://api.iog.com/procurement              │ │
│  └───┬──────────┬──────────┬──────────┬────────────────┘   │
│      │          │          │          │                     │
│  ┌───▼────┐ ┌──▼────┐ ┌───▼────┐ ┌──▼────┐               │
│  │Lambda  │ │Lambda │ │Lambda  │ │Lambda │               │
│  │lookup  │ │search │ │search  │ │validate               │
│  │employee│ │policy │ │vendor  │ │request│               │
│  └───┬────┘ └──┬────┘ └───┬────┘ └──┬────┘               │
│      │          │          │          │                     │
│      └──────────┴──────────┴──────────┘                     │
│                 │                                           │
│         ┌───────▼────────┐                                  │
│         │   DynamoDB     │                                  │
│         │  (NoSQL Data)  │                                  │
│         └────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

**Pros**:
- Pay-per-use (very cost-effective at low volume)
- Infinite auto-scaling
- No server management
- High availability built-in

**Cons**:
- Cold start latency (~1-2 seconds)
- More complex architecture
- Requires refactoring to separate functions

---

**Option 3: Container Deployment (Kubernetes)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Ingress Controller                     │ │
│  │           https://procurement-api.iog.com              │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │              Service (Load Balancer)                    │ │
│  └────┬──────────────┬──────────────┬────────────────────┘ │
│       │              │              │                       │
│  ┌────▼─────┐  ┌─────▼────┐  ┌─────▼────┐                │
│  │  Pod 1   │  │  Pod 2   │  │  Pod 3   │                │
│  │ (Server) │  │ (Server) │  │ (Server) │                │
│  │ Port 3001│  │ Port 3001│  │ Port 3001│                │
│  └──────────┘  └──────────┘  └──────────┘                │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           ConfigMap (Environment Variables)             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Secrets (API Keys, Credentials)                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Pros**:
- Industry-standard container orchestration
- Easy scaling and updates
- Rolling deployments (zero downtime)
- Works with any cloud provider

**Cons**:
- Steep learning curve
- Higher operational complexity
- Overkill for small projects

---

### Deployment Checklist

**Pre-Deployment**:
- [ ] Set up production environment variables
- [ ] Configure production database
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Load test the application
- [ ] Security audit (penetration testing)

**Deployment**:
- [ ] Deploy application code
- [ ] Migrate data to production database
- [ ] Update Vapi configuration with production URL
- [ ] Test all 4 functions end-to-end
- [ ] Update DNS records
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules

**Post-Deployment**:
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify data integrity
- [ ] Test fail-over scenarios
- [ ] Document runbook for operations team
- [ ] Set up alerts for downtime/errors

---

## Monitoring & Observability

### Key Metrics to Track

**System Health**:
- Server uptime
- CPU usage
- Memory usage
- Disk space
- Network I/O

**Application Metrics**:
- Request count per endpoint
- Average response time per endpoint
- Error rate (4xx, 5xx)
- Function call success rate
- Data reload frequency

**Business Metrics**:
- Total calls received
- Average call duration
- Self-service rate (% of questions answered without routing)
- Incomplete request rate (should be 0%)
- Top searched policies
- Top searched vendors

### Logging Strategy

**Current Logging** (Development):
```javascript
console.log('📥 Full request body:', JSON.stringify(req.body, null, 2));
console.log(`👤 Employee lookup: "${name}"`);
console.log(`✅ Found: ${employee.name} (${employee.team})`);
```

**Production Logging** (Recommended):
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'procurement-voice-ai' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('Employee lookup', { name, toolCallId, timestamp: Date.now() });
logger.error('Function call failed', { error, endpoint, timestamp: Date.now() });
```

**Log Aggregation**:
- Use ELK Stack (Elasticsearch, Logstash, Kibana)
- Or Datadog / New Relic / CloudWatch Logs
- Centralized log search and analysis

### Monitoring Tools

**Recommended Stack**:
1. **Application Monitoring**: New Relic / Datadog
   - Track response times
   - Identify slow functions
   - Alert on errors

2. **Infrastructure Monitoring**: CloudWatch / Prometheus + Grafana
   - Server health metrics
   - Resource utilization
   - Auto-scaling triggers

3. **Uptime Monitoring**: UptimeRobot / Pingdom
   - Ping /health endpoint every 60 seconds
   - Alert if down for >2 minutes

4. **Error Tracking**: Sentry
   - Capture and aggregate errors
   - Stack trace analysis
   - User impact assessment

### Alerting Rules

**Critical Alerts** (Page on-call):
- Server down for >2 minutes
- Error rate >10% for 5 minutes
- Response time >5 seconds for 5 minutes

**Warning Alerts** (Email/Slack):
- Error rate >5% for 10 minutes
- Response time >3 seconds for 10 minutes
- Memory usage >80%
- Disk space <20%

**Informational Alerts**:
- Daily summary report
- Weekly usage statistics
- Monthly cost report

### Dashboards

**Operations Dashboard**:
- System health (green/yellow/red status)
- Request count (last hour, last day)
- Error rate trend
- Response time trend
- Top 5 slowest endpoints

**Business Dashboard**:
- Total calls today/this week/this month
- Self-service rate trend
- Top 10 policy searches
- Top 10 vendor searches
- Incomplete request rate (should be 0%)
- Average call duration

---

## Future Enhancements

### Phase 2: JIRA Integration

**Goal**: Automatically create validated procurement requests as JIRA tickets

**Implementation**:
```javascript
const JiraClient = require('jira-connector');

async function submitToJira(validatedRequest) {
  const jira = new JiraClient({
    host: 'iog.atlassian.net',
    basic_auth: {
      email: process.env.JIRA_EMAIL,
      api_token: process.env.JIRA_API_TOKEN
    }
  });
  
  const issue = await jira.issue.createIssue({
    fields: {
      project: { key: 'PROC' },
      summary: validatedRequest.description,
      description: `
        Budget Number: ${validatedRequest.budget_number}
        Milestones: ${validatedRequest.milestones}
        Costs: ${validatedRequest.costs}
        Deadline: ${validatedRequest.deadline || 'Not specified'}
      `,
      issuetype: { name: 'Procurement Request' }
    }
  });
  
  return issue.key; // Returns "PROC-123"
}
```

**User Experience**:
- AI collects all required fields
- Validates completeness
- Creates JIRA ticket automatically
- Returns ticket number to caller: "Your request has been submitted as ticket PROC-123"

**Impact**: Eliminates manual ticket creation step

---

### Phase 3: Tract System Integration

**Goal**: Pull real contract data instead of using static JSON file

**Implementation**:
```javascript
async function searchVendorsLive(query) {
  // Query Tract system API
  const response = await fetch('https://tract.iog.com/api/vendors', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TRACT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  const vendors = await response.json();
  return vendors;
}
```

**Benefits**:
- Always up-to-date vendor data
- No manual database updates needed
- Access to full contract history

**Prerequisites**:
- Tract system must have API
- API key / authentication setup
- Data format mapping

---

### Phase 4: Budget Validation

**Goal**: Verify budget numbers are valid before accepting requests

**Implementation**:
```javascript
async function validateBudgetNumber(budgetNumber) {
  // Check against finance system
  const response = await fetch(`https://finance.iog.com/api/budget/${budgetNumber}`, {
    headers: { 'Authorization': `Bearer ${process.env.FINANCE_API_KEY}` }
  });
  
  if (!response.ok) {
    return { valid: false, error: 'Budget number not found' };
  }
  
  const budget = await response.json();
  
  if (budget.status !== 'active') {
    return { valid: false, error: 'Budget is not active' };
  }
  
  if (budget.remaining < 0) {
    return { valid: false, error: 'Budget has no remaining funds' };
  }
  
  return { valid: true, budget };
}
```

**Enhanced Validation**:
- Check if budget exists
- Verify budget is active
- Confirm funds available
- Alert if insufficient funds

---

### Phase 5: Email Confirmations

**Goal**: Send email confirmation after request submission

**Implementation**:
```javascript
const nodemailer = require('nodemailer');

async function sendConfirmationEmail(requester, request) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.iog.com',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  await transporter.sendMail({
    from: 'procurement@iog.com',
    to: requester.email,
    subject: 'Procurement Request Submitted',
    html: `
      <h2>Your procurement request has been submitted</h2>
      <p><strong>Request ID:</strong> ${request.id}</p>
      <p><strong>Description:</strong> ${request.description}</p>
      <p><strong>Budget:</strong> ${request.budget_number}</p>
      <p><strong>Cost:</strong> ${request.costs}</p>
      <p>Expected response time: 7-10 business days</p>
      <p>You'll receive an update from Andrea's team soon.</p>
    `
  });
}
```

---

### Phase 6: Analytics Dashboard

**Goal**: Track metrics on time saved, self-service rate, and system usage

**Metrics to Display**:
- Total calls this month
- Self-service rate (% answered without routing)
- Average call duration
- Top policy questions
- Top vendor searches
- Incomplete request rate (should be 0%)
- Estimated time saved (incomplete requests prevented × 3 days)

**Technology**:
- Frontend: React + Chart.js
- Backend: Add analytics endpoints to server
- Database: PostgreSQL with time-series data
- Refresh: Real-time via WebSocket or polling

---

### Phase 7: Multi-Language Support

**Goal**: Support non-English speakers

**Implementation**:
- Detect caller's language (if Vapi supports)
- Translate system prompt to target language
- Translate policy documents (or maintain multilingual versions)
- Use multilingual TTS models

**Languages**: Spanish, French, German, Mandarin

---

### Phase 8: Advanced Vendor Matching

**Goal**: ML-based vendor recommendation (beyond keyword search)

**Approach**:
1. **Collect Training Data**: Past requests + vendor selections
2. **Train Model**: Predict best vendor based on request characteristics
3. **Deploy**: Integrate model inference into search_vendor_history()

**Features**:
- Consider vendor availability
- Factor in past performance ratings
- Optimize for cost (lowest discount) or speed (fastest delivery)

**Technology**: TensorFlow.js or external ML API

---

### Phase 9: Voice Biometrics

**Goal**: Automatically identify callers by voice

**Implementation**:
- Integrate voice biometric service (e.g., Pindrop, Nuance)
- Match voice print to employee database
- Skip "What's your name?" step

**Privacy Considerations**:
- Require opt-in enrollment
- GDPR/CCPA compliance
- Secure storage of voice prints

---

### Phase 10: Escalation & Transfer

**Goal**: Transfer complex calls to live procurement team member

**Implementation**:
- Detect when AI can't help (e.g., complex negotiation questions)
- Use Vapi's transfer capabilities
- Route to appropriate team member based on request type

**Trigger Conditions**:
- User explicitly asks for human
- AI confidence score < 50%
- Issue requires judgment call

---

## Appendix

### File Structure

```
procurement-voice-bot/
├── .env                                    # Environment variables
├── .gitignore                              # Git ignore rules
├── package.json                            # Node.js dependencies
├── package-lock.json                       # Dependency lock file
├── configure-complete-system.js            # Vapi configuration script
├── procurement-services-prompt.txt         # AI system prompt (3,800 words)
├── BUILD_COMPLETE.md                       # Build summary
├── PROCUREMENT_VOICE_AI_PLAN.md           # Implementation plan
├── ARCHITECTURE.md                         # This file
│
├── mcp-servers/
│   ├── unified-server.js                  # Main backend server
│   │
│   ├── employee-context/
│   │   └── employee-database.json         # 5 employees (Andrea's team)
│   │
│   ├── vendor-context/
│   │   └── vendor-database.json           # 12 approved vendors
│   │
│   └── procurement-rag/
│       └── procurement-docs/
│           ├── vendor-onboarding.md       # Onboarding process guide
│           ├── contract-templates.md      # Template selection guide
│           ├── payment-rules.md           # Payment terms & rules
│           └── procurement-faq.md         # Common questions
│
└── node_modules/                          # Dependencies (not committed)
```

---

### Environment Variables Reference

```bash
# Required
VAPI_API_KEY=your_vapi_api_key              # Vapi platform API key
VAPI_ASSISTANT_ID=your_assistant_id         # Assistant ID (d42c88a5-1e26-40b9-8fbb-8f41e5b9a2fc)
PORT=3001                                    # Server port

# Optional (for development)
OPENAI_API_KEY=your_openai_key              # If using OpenAI directly
```

---

### Useful Commands

**Start Server**:
```bash
cd mcp-servers
node unified-server.js
```

**Start Ngrok**:
```bash
ngrok http 3001
```

**Configure Vapi**:
```bash
node configure-complete-system.js https://your-ngrok-url
```

**Test Health Endpoint**:
```bash
curl http://localhost:3001/health
```

**Test Employee Lookup**:
```bash
curl -X POST http://localhost:3001/lookup-employee \
  -H "Content-Type: application/json" \
  -d '{"message":{"toolCallList":[{"id":"test","function":{"arguments":{"name":"Andrea"}}}]}}'
```

**Reload Data** (after updating JSON files):
```bash
curl -X POST http://localhost:3001/reload
```

---

### Troubleshooting

**Issue**: Functions returning "undefined"
- **Cause**: Wrong response format
- **Fix**: Ensure response matches Vapi format: `{ results: [{ toolCallId, result }] }`

**Issue**: Search returns wrong results
- **Cause**: Poor keyword matching or document chunking
- **Fix**: Adjust scoring weights in search algorithm

**Issue**: Server not responding
- **Cause**: Port already in use or server crashed
- **Fix**: Kill process on port 3001: `lsof -ti:3001 | xargs kill -9`

**Issue**: Ngrok tunnel expired
- **Cause**: Free ngrok tunnels expire after 2 hours
- **Fix**: Restart ngrok, update Vapi configuration with new URL

**Issue**: AI not calling functions
- **Cause**: Function descriptions unclear or system prompt issue
- **Fix**: Review function descriptions, make them more explicit

---

### Contact & Support

**Project Owner**: [Your Name]
**Team**: Procurement AI Development
**Repository**: [Git URL if applicable]
**Documentation**: This file (ARCHITECTURE.md)

**For Questions**:
- Technical issues: [Tech support contact]
- Business requirements: Andrea Smith (andrea.smith@iog.com)
- Vapi platform: https://docs.vapi.ai

---

**Document Version**: 1.0
**Last Updated**: 2025-01-12
**Status**: Production Ready
**Maintained By**: Development Team

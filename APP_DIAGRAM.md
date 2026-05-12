# App Diagram (Deployment/Runtime): Procurement Voice AI System

## System Architecture Overview

The Procurement Voice AI System follows a **microservices-oriented architecture** with a central Node.js backend server that integrates with cloud-based AI services. The system consists of one primary deployable unit (Unified MCP Server) that runs on-premises or in a development environment, exposed via ngrok tunnel during development. The architecture leverages external SaaS platforms (Vapi AI, OpenAI GPT-4) for voice and AI processing while maintaining data sovereignty through local JSON-based data stores. The system is designed as a **lightweight, stateless API service** that can scale horizontally when deployed to production cloud infrastructure.

**Key Technical Characteristics:**
- **Deployment Model**: Single Node.js/Express application (monolithic backend) with microservice-like external integrations
- **Hosting**: Currently local development with ngrok tunnel; production-ready for containerization (Docker) and cloud deployment (AWS, GCP, Azure)
- **Communication**: RESTful HTTP/HTTPS APIs with JSON payloads
- **Data Storage**: File-based JSON databases (development); designed for migration to PostgreSQL/MongoDB in production
- **External Dependencies**: Cloud-based SaaS services for voice AI (Vapi) and natural language processing (OpenAI)

## Deployable Units Summary

### Core Application
- **Unified MCP Server** (Node.js/Express): Central API server handling all business logic, data access, and function orchestration

### Data Stores
- **Employee Database** (JSON): File-based data store containing employee profiles, roles, and procurement history
- **Vendor Database** (JSON): File-based data store containing approved vendor information, contracts, and ratings
- **Policy Document Repository** (Markdown): File-based storage for procurement policy documents with RAG-based retrieval

### External Services
- **Vapi AI Platform** (Cloud SaaS): Voice telephony, speech-to-text, text-to-speech, and call orchestration
- **OpenAI GPT-4 API** (Cloud SaaS): Natural language understanding, conversation management, and function calling
- **Deepgram** (via Vapi): Speech-to-text transcription service
- **PlayHT** (via Vapi): Text-to-speech voice synthesis service

### Development Infrastructure
- **Ngrok Tunnel**: Local-to-public HTTP tunnel for development webhook exposure

## App Diagram (Deployment/Runtime)

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

!define DEVICONS https://raw.githubusercontent.com/tupadr3/plantuml-icon-font-sprites/master/devicons
!include DEVICONS/nodejs.puml
!include DEVICONS/javascript.puml

LAYOUT_WITH_LEGEND()

title Procurement Voice AI System - Deployment/Runtime Architecture

Person(caller, "Internal Employee", "Marketing, Engineering,\nFinance, Operations")
Person(procurementmgr, "Procurement Manager", "Andrea Smith")

System_Boundary(cloud, "Cloud Services (External SaaS)") {
    System_Ext(vapi, "Vapi AI Platform", "Voice telephony platform\nProvides phone number,\nSTT, TTS, call management\n(Port: 443/HTTPS)")

    System_Ext(openai, "OpenAI GPT-4", "Large language model API\nNatural language processing\nConversation logic\n(Port: 443/HTTPS)")

    System_Ext(deepgram, "Deepgram STT", "Speech-to-text service\n(Accessed via Vapi)")

    System_Ext(playht, "PlayHT TTS", "Text-to-speech service\n(Accessed via Vapi)")
}

System_Boundary(dev, "Development Environment (localhost)") {
    Container(ngrok, "Ngrok Tunnel", "HTTP Proxy", "Exposes local server\nto public internet\n(https://*.ngrok-free.dev)")

    Container(mcpserver, "Unified MCP Server", "Node.js v14+, Express 4.18", "Core API server\nHandles business logic\nManages data access\n(Port: 3001)")

    ContainerDb(employeedb, "Employee Database", "JSON File", "5 employee records\nRoles, preferences,\nprocurement history\n(employee-database.json)")

    ContainerDb(vendordb, "Vendor Database", "JSON File", "12 approved vendors\nSkills, projects, contracts,\npricing, ratings\n(vendor-database.json)")

    ContainerDb(policydb, "Policy Repository", "Markdown Files", "4 policy documents\n146 text chunks\nVendor onboarding, contracts,\npayment rules, FAQ\n(*.md files)")
}

Rel(caller, vapi, "Calls via phone", "Voice/PSTN\n+1 (930) 254-9264")
Rel(vapi, deepgram, "Transcribes speech", "HTTPS/API")
Rel(vapi, playht, "Synthesizes speech", "HTTPS/API")
Rel(vapi, openai, "Processes conversation", "HTTPS/REST\nFunction calling")
Rel(openai, vapi, "Returns AI responses", "HTTPS/REST")

Rel(vapi, ngrok, "Invokes functions", "HTTPS Webhooks\n(POST requests)")
Rel(ngrok, mcpserver, "Forwards requests", "HTTP/JSON\nlocalhost:3001")

Rel(mcpserver, employeedb, "Reads employee data", "File I/O\nJSON parsing")
Rel(mcpserver, vendordb, "Searches vendors", "File I/O\nJSON parsing\nKeyword scoring")
Rel(mcpserver, policydb, "Retrieves policies", "File I/O\nRAG search\nMarkdown parsing")

Rel(mcpserver, ngrok, "Returns function results", "HTTP/JSON\nVapi response format")
Rel(ngrok, vapi, "Delivers results", "HTTPS/JSON")
Rel(vapi, openai, "Sends function results", "HTTPS/REST")
Rel(openai, vapi, "Generates response", "HTTPS/REST")
Rel(vapi, caller, "Speaks response", "Voice/PSTN\nSynthesized speech")

Rel(mcpserver, procurementmgr, "Routes validated requests", "Email/JIRA\n(Future integration)")

SHOW_LEGEND()
@enduml
```

## Component Details

### Applications & Services

#### Unified MCP Server
- **Technology Stack**: Node.js (v14+), Express.js 4.18.2, JavaScript (ES6+)
- **Deployment Method**: Currently runs locally via `node unified-server.js`; production deployment via Docker container or cloud VM
- **Port**: 3001 (configurable via `PORT` environment variable)
- **Runtime**: Single-threaded Node.js process with asynchronous I/O
- **Primary Responsibilities**:
  - Expose REST API endpoints for employee lookup, policy search, vendor discovery, and request validation
  - Load and parse JSON databases and Markdown policy documents into memory at startup
  - Execute business logic for keyword-based search algorithms (vendor matching, policy RAG)
  - Validate procurement request completeness against required fields
  - Format responses in Vapi-compatible webhook format
  - Handle health checks and data reloading
- **Scaling Strategy**: Stateless design allows horizontal scaling behind load balancer; in-memory data can be moved to external cache (Redis) for multi-instance deployments
- **Dependencies**: dotenv (configuration), express (HTTP server), fs/path (file I/O)

#### Vapi AI Platform (External SaaS)
- **Technology Stack**: Cloud-based voice AI platform (proprietary)
- **Deployment Method**: Fully managed SaaS; no deployment required
- **Primary Responsibilities**:
  - Provide phone number (+1 930-254-9264) and telephony infrastructure
  - Accept incoming phone calls from PSTN network
  - Convert speech to text using Deepgram integration
  - Send text to OpenAI GPT-4 for AI processing
  - Invoke custom function tools via HTTPS webhooks to MCP server
  - Synthesize AI responses to speech using PlayHT integration
  - Manage call state, session continuity, and conversation flow
- **Integration Method**: Configured via Vapi API; webhook URLs point to ngrok tunnel (dev) or production server URL
- **API**: REST API for assistant configuration, call management, and function tool definitions

#### OpenAI GPT-4 API (External SaaS)
- **Technology Stack**: Large language model hosted by OpenAI
- **Deployment Method**: Fully managed SaaS; accessed via HTTPS API
- **Primary Responsibilities**:
  - Understand natural language user intents from transcribed speech
  - Determine which function tools to call based on conversation context
  - Generate natural, conversational responses in text format
  - Follow 3,800+ word system prompt defining procurement assistant behavior
  - Manage multi-turn conversations with context retention
- **Integration Method**: Invoked by Vapi platform via OpenAI API; system prompt and function definitions configured via Vapi
- **Model Configuration**: `gpt-4`, temperature `0.7`, function calling enabled

### Databases & Data Stores

#### Employee Database (JSON)
- **Type**: File-based JSON database
- **Location**: `mcp-servers/employee-context/employee-database.json`
- **Data Model**: Array of employee objects with fields: id, name, firstName, lastName, email, team, department, title, location, manager, directReports, projects, specialties, procurementHistory, preferences, notes
- **Size**: 5 employee records (Andrea Smith's procurement team + frequent requesters)
- **Access Pattern**: Loaded into memory at server startup; searched via exact/fuzzy name matching
- **Update Mechanism**: Manual file editing; server reload via `/reload` endpoint or restart
- **Production Migration Path**: PostgreSQL or MongoDB with indexed name fields for faster lookups

#### Vendor Database (JSON)
- **Type**: File-based JSON database
- **Location**: `mcp-servers/vendor-context/vendor-database.json`
- **Data Model**: Array of vendor objects with fields: id, name, skills, pastProjects, averageDiscount, contracts, contactInfo, status, notes, rating
- **Size**: 12 approved vendor records with full contract history
- **Access Pattern**: Loaded into memory at startup; searched via keyword scoring algorithm (name: 10 pts, skills: 5 pts, projects: 3 pts)
- **Update Mechanism**: Manual file editing; server reload via `/reload` endpoint or restart
- **Production Migration Path**: PostgreSQL or MongoDB with full-text search indexes on skills and projects

#### Policy Document Repository (Markdown)
- **Type**: File-based Markdown document storage with section-based chunking
- **Location**: `mcp-servers/procurement-rag/procurement-docs/*.md`
- **Documents**: 4 policy files (vendor-onboarding.md, contract-templates.md, payment-rules.md, procurement-faq.md)
- **Chunking Strategy**: Split on `##` (sections) and `###` (subsections) markdown headers to preserve semantic boundaries
- **Total Chunks**: 146 text chunks indexed in memory
- **Access Pattern**: RAG (Retrieval Augmented Generation) search using keyword-based TF-IDF-like scoring algorithm
- **Search Performance**: Sub-100ms in-memory search; no vector embeddings or external DB required
- **Update Mechanism**: Add/modify `.md` files in directory; server reload via `/reload` endpoint
- **Production Migration Path**: Elasticsearch or vector database (Pinecone, Weaviate) for semantic search

### External Integrations

#### Deepgram Speech-to-Text (via Vapi)
- **Purpose**: Convert phone call audio to text transcriptions
- **Integration Method**: Accessed transparently through Vapi platform; no direct API calls from MCP server
- **Protocol**: HTTPS/REST (Vapi ↔ Deepgram)
- **Data Flow**: Vapi sends audio streams → Deepgram returns transcriptions → Vapi forwards to GPT-4
- **Latency**: Real-time streaming with <500ms lag

#### PlayHT Text-to-Speech (via Vapi)
- **Purpose**: Synthesize AI-generated text responses into natural voice
- **Integration Method**: Accessed transparently through Vapi platform; no direct API calls from MCP server
- **Protocol**: HTTPS/REST (Vapi ↔ PlayHT)
- **Data Flow**: GPT-4 generates text → Vapi sends to PlayHT → PlayHT returns audio → Vapi plays to caller
- **Voice Quality**: Natural-sounding, configurable voice selection

#### Ngrok Tunnel (Development Infrastructure)
- **Purpose**: Expose local development server (localhost:3001) to public internet for Vapi webhook delivery
- **Deployment**: Runs locally via `ngrok http 3001 --domain=sprier-sulfurously-wendy.ngrok-free.dev`
- **URL**: `https://sprier-sulfurously-wendy.ngrok-free.dev` (static subdomain for development)
- **Protocol**: HTTPS proxy with automatic SSL termination
- **Production Replacement**: Not used in production; replaced with direct cloud server URL (e.g., `https://api.iog.com`)
- **Security**: Free tier ngrok provides basic HTTPS; production requires authenticated endpoints

### Infrastructure Components

#### Load Balancer (Production - Not Yet Implemented)
- **Purpose**: Distribute traffic across multiple MCP server instances for high availability
- **Technology**: AWS ALB/ELB, Google Cloud Load Balancer, or Nginx
- **Health Check**: `/health` endpoint (GET request every 30 seconds)
- **Routing**: Round-robin or least-connections algorithm

#### Container Orchestration (Production - Not Yet Implemented)
- **Purpose**: Manage deployment, scaling, and health of containerized MCP server
- **Technology Options**: Kubernetes, AWS ECS, Google Cloud Run, or Docker Swarm
- **Scaling Policy**: Auto-scale based on CPU utilization (>70%) or request rate (>100 req/min)

#### Caching Layer (Production - Not Yet Implemented)
- **Purpose**: Cache frequently accessed data (employee lookups, policy search results, vendor searches)
- **Technology**: Redis or Memcached
- **Cache Strategy**: Time-based expiration (1 hour) with manual invalidation on data updates
- **Performance Gain**: Reduce response time from ~100ms to <10ms for cached queries

## API Specifications

### API: Unified MCP Server REST API

**Base URL**: `http://localhost:3001` (development) or `https://api.iog.com/procurement` (production)

**Type**: RESTful HTTP API

**Authentication**: None (development); API key or JWT required (production)

**Content-Type**: `application/json`

**Response Format**: Vapi webhook response format with `results` array containing `toolCallId` and `result` fields

---

### Endpoint: POST `/lookup-employee`

**Purpose**: Retrieve employee context by name for personalized interactions

**Request Body** (Vapi webhook format):
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

**Response**:
```json
{
  "results": [{
    "toolCallId": "call_abc123",
    "result": "Employee found: Andrea Smith, Procurement Manager in Procurement & Vendor Management..."
  }]
}
```

**Performance**: ~50ms average response time

**Error Handling**: Returns error message in `result` field if name not found

---

### Endpoint: POST `/search-policies`

**Purpose**: Search procurement policy documents using RAG-based keyword matching

**Request Body**:
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

**Response**:
```json
{
  "results": [{
    "toolCallId": "call_xyz789",
    "result": "## Step 1: Initial Vendor Assessment... [combined text from top 3 matching sections]"
  }]
}
```

**Performance**: ~100-200ms (in-memory search over 146 chunks)

**Search Algorithm**: Keyword-based TF-IDF-like scoring with section header boosting

---

### Endpoint: POST `/search-vendors`

**Purpose**: Find approved vendors by skills, past projects, or capabilities

**Request Body**:
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

**Response**:
```json
{
  "results": [{
    "toolCallId": "call_def456",
    "result": "TechForge Solutions: Rust engineers, Blockchain development... Rating: 4.8/5. Quantum Rust Labs: ..."
  }]
}
```

**Performance**: ~50-100ms (in-memory search over 12 vendors)

**Search Algorithm**: Weighted keyword scoring (name: 10 pts, skills: 5 pts, projects: 3 pts)

---

### Endpoint: POST `/validate-request`

**Purpose**: Validate procurement request completeness before submission

**Request Body**:
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
          "description": "Marketing automation software",
          "deadline": "2024-12-31"
        }
      }
    }]
  }
}
```

**Response (Complete)**:
```json
{
  "results": [{
    "toolCallId": "call_ghi789",
    "result": "All required fields are present! Your request is ready to submit."
  }]
}
```

**Response (Incomplete)**:
```json
{
  "results": [{
    "toolCallId": "call_ghi789",
    "result": "Missing required fields: budget number, milestones. Please provide these..."
  }]
}
```

**Performance**: ~10-20ms (simple field validation logic)

---

### Endpoint: GET `/health`

**Purpose**: Health check for monitoring and load balancer probes

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

**Performance**: <5ms (simple status check)

**Use Case**: Kubernetes liveness/readiness probes, load balancer health checks, monitoring systems

---

### Endpoint: POST `/reload`

**Purpose**: Hot-reload data sources without server restart

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

**Performance**: ~100-200ms (file I/O and parsing)

**Use Case**: Development workflow after updating JSON databases or policy documents

## Runtime Interactions & Data Flow

### Interaction 1: Employee Lookup Call Flow
**Path**: Caller → Vapi → OpenAI → Vapi → Ngrok → MCP Server → Employee DB → (reverse path)

**Protocol**: Voice (PSTN) → HTTPS (Vapi webhooks) → HTTP (ngrok proxy) → File I/O

**Purpose**: Recognize employee by name and retrieve personalized context for tailored service

**Data Flow**:
1. Caller says name: "Hi, this is Andrea"
2. Vapi transcribes speech via Deepgram
3. OpenAI GPT-4 detects name mention and calls `lookup_employee("Andrea")`
4. Vapi sends HTTPS POST webhook to ngrok tunnel
5. Ngrok forwards to `localhost:3001/lookup-employee`
6. MCP server searches employee database using exact/fuzzy matching
7. Returns employee context in Vapi response format
8. OpenAI receives result and generates personalized greeting
9. Vapi synthesizes speech via PlayHT
10. Caller hears: "Thanks Andrea! I see you're the Procurement Manager..."

**Latency**: ~2-3 seconds end-to-end (network + AI processing + TTS)

**Scalability**: Employee database can scale to 1000+ records with sub-100ms search times; consider indexing for 10,000+ records

---

### Interaction 2: Policy Question RAG Search
**Path**: Caller → Vapi → OpenAI → Vapi → Ngrok → MCP Server → Policy Docs → (reverse path)

**Protocol**: Voice (PSTN) → HTTPS (Vapi webhooks) → HTTP (ngrok proxy) → File I/O

**Purpose**: Provide instant self-service answers to procurement policy questions without human intervention

**Data Flow**:
1. Caller asks: "What's the vendor onboarding process?"
2. Vapi transcribes speech
3. OpenAI calls `search_procurement_policies("vendor onboarding process")`
4. Webhook delivered to MCP server
5. Server performs RAG search over 146 document chunks using keyword scoring
6. Returns top 3 matching sections combined as single text
7. OpenAI formats response naturally
8. Vapi synthesizes and speaks answer

**Latency**: ~3-4 seconds end-to-end

**Scalability**: Current keyword search scales to ~500 chunks with <200ms latency; migrate to vector search (embeddings + Pinecone) for 10,000+ chunks

---

### Interaction 3: Vendor Discovery Search
**Path**: Caller → Vapi → OpenAI → Vapi → Ngrok → MCP Server → Vendor DB → (reverse path)

**Protocol**: Voice (PSTN) → HTTPS (Vapi webhooks) → HTTP (ngrok proxy) → File I/O

**Purpose**: Find approved vendors matching specific skills or past project experience

**Data Flow**:
1. Caller requests: "Do we have Rust developers?"
2. OpenAI calls `search_vendor_history("Rust developers")`
3. MCP server scores all 12 vendors using keyword matching algorithm
4. Returns top 5 vendors sorted by relevance score
5. OpenAI summarizes vendor details conversationally
6. Caller receives vendor recommendations with contact info

**Latency**: ~2-3 seconds end-to-end

**Scalability**: Current in-memory search handles 100+ vendors efficiently; migrate to Elasticsearch for 1,000+ vendors with complex filtering

---

### Interaction 4: Request Validation Flow
**Path**: Caller → Vapi → OpenAI → Vapi → Ngrok → MCP Server → Validation Logic → (reverse path)

**Protocol**: Voice (PSTN) → HTTPS (Vapi webhooks) → HTTP (ngrok proxy) → Business logic

**Purpose**: Ensure 100% of procurement requests contain all required fields before routing to procurement team

**Data Flow**:
1. Caller provides request details over multiple conversational turns
2. OpenAI collects: budget_number, milestones, costs, description, deadline
3. OpenAI calls `validate_request({...fields})`
4. MCP server checks for presence of all required fields
5. Returns validation result with list of missing fields (if any)
6. If incomplete: OpenAI prompts caller to provide missing information (loop back to step 1)
7. If complete: OpenAI confirms submission and thanks caller

**Latency**: ~2 seconds for validation check

**Scalability**: Stateless validation logic scales infinitely; add external API calls for budget validation or approval workflow integration

---

### Interaction 5: Continuous Conversation Loop
**Path**: Vapi → OpenAI → Vapi (repeated for multi-turn conversations)

**Protocol**: HTTPS (OpenAI API calls)

**Purpose**: Maintain conversational context across multiple user utterances and AI responses

**Data Flow**:
1. Vapi maintains session state with conversation history
2. Each user utterance appended to GPT-4 chat history
3. GPT-4 generates responses with full context awareness
4. Function call results integrated into conversation
5. Loop continues until caller signals completion ("That's all", "Thanks")

**Latency**: ~1-2 seconds per conversational turn

**Scalability**: OpenAI handles conversation context automatically; very long conversations (>50 turns) may hit token limits (monitor and truncate if needed)

## Deployment Architecture

### Deployment Strategy

#### Current: Local Development with Ngrok Tunnel
**Deployment Steps**:
1. Start MCP server: `node mcp-servers/unified-server.js` (runs on `localhost:3001`)
2. Start ngrok tunnel: `ngrok http 3001 --domain=sprier-sulfurously-wendy.ngrok-free.dev`
3. Configure Vapi assistant: `node configure-complete-system.js https://sprier-sulfurously-wendy.ngrok-free.dev`
4. Test by calling +1 (930) 254-9264

**Pros**: Fast iteration, easy debugging, no deployment overhead

**Cons**: Not production-ready, ngrok URL expires, single point of failure, developer machine must stay running

---

#### Recommended: Docker Container Deployment

**Dockerfile** (not yet created, but architecture supports it):
```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY mcp-servers ./mcp-servers
COPY procurement-services-prompt.txt ./
EXPOSE 3001
CMD ["node", "mcp-servers/unified-server.js"]
```

**Deployment Steps**:
1. Build Docker image: `docker build -t procurement-voice-ai:v1.0 .`
2. Push to container registry: `docker push registry.iog.com/procurement-voice-ai:v1.0`
3. Deploy to cloud:
   - **AWS ECS/Fargate**: Create ECS service with task definition
   - **Google Cloud Run**: `gcloud run deploy procurement-voice-ai --image=...`
   - **Kubernetes**: Apply deployment YAML with 3 replicas
4. Update Vapi configuration with production URL: `https://api.iog.com/procurement`

**Pros**: Portable, consistent environments, easy scaling, production-grade

---

#### Alternative: Serverless Deployment

**AWS Lambda Approach**:
- Separate Lambda functions for each endpoint (`lookup-employee`, `search-policies`, etc.)
- API Gateway for HTTP routing
- DynamoDB for employee/vendor data (instead of JSON files)
- S3 for policy documents with Lambda function for RAG search

**Pros**: Pay-per-use, infinite auto-scaling, no server management

**Cons**: Cold start latency (~1-2 seconds), more complex architecture, requires refactoring to separate functions

---

### Infrastructure

#### Cloud Provider
**Recommended**: AWS, Google Cloud Platform, or Azure

**Rationale**: Full support for containerized deployments, managed databases, load balancing, and monitoring

#### Architecture: Production Deployment on AWS

```
Internet
   ↓
Route 53 (DNS)
   ↓
CloudFront (CDN - optional for static assets)
   ↓
Application Load Balancer (ALB)
   ↓
Target Group (Health checks on /health endpoint)
   ↓
┌──────────────────────────────────────────────┐
│  ECS/Fargate (Container Orchestration)       │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Task Instance 1 │  │  Task Instance 2 │   │
│  │  MCP Server      │  │  MCP Server      │   │
│  │  (Container)     │  │  (Container)     │   │
│  └─────────────────┘  └─────────────────┘   │
└──────────────────────────────────────────────┘
   ↓
RDS PostgreSQL (Employee + Vendor data)
   ↓
S3 Bucket (Policy documents)
   ↓
ElastiCache Redis (Caching layer)
```

**Components**:
- **Route 53**: DNS for `api.iog.com`
- **ALB**: Load balancer distributing traffic across ECS tasks
- **ECS/Fargate**: Managed container orchestration running 2-5 MCP server instances
- **RDS PostgreSQL**: Replaces JSON files for employee and vendor data
- **S3**: Stores policy Markdown documents
- **ElastiCache Redis**: Caches frequent searches (employee lookups, policy queries)
- **CloudWatch**: Logging, metrics, and alarms

**Regions**: US-East-1 (primary), US-West-2 (failover for disaster recovery)

**Availability Zones**: Multi-AZ deployment (2-3 AZs) for high availability

---

#### Load Balancing & Scaling

**Load Balancer Configuration**:
- **Algorithm**: Round-robin or least-connections
- **Health Check**: GET `/health` every 30 seconds; mark unhealthy after 2 consecutive failures
- **Session Affinity**: Not required (stateless API)
- **SSL/TLS**: HTTPS termination at load balancer with AWS Certificate Manager

**Auto-Scaling Policy**:
- **Metric**: CPU utilization > 70% for 2 minutes → scale up
- **Metric**: Request count > 100 req/min → scale up
- **Min Instances**: 2 (for high availability)
- **Max Instances**: 10 (burst capacity)
- **Scale-Down**: CPU < 30% for 5 minutes → scale down (with 5-minute cooldown)

---

### Runtime Dependencies

#### Critical Dependencies
1. **Vapi AI Platform**: Required for all phone call handling; system is inoperable without Vapi
   - **Failover**: None (single SaaS provider); consider Twilio as backup voice provider
   - **SLA**: 99.9% uptime per Vapi service agreement

2. **OpenAI GPT-4 API**: Required for conversation intelligence and function calling
   - **Failover**: Consider fallback to GPT-3.5-turbo for cost savings during high load
   - **Rate Limits**: Monitor usage to stay within OpenAI API rate limits (tier-dependent)

3. **Employee/Vendor/Policy Data**: Required for function results; server loads at startup
   - **Failover**: Pre-load data into memory with periodic reload; add Redis cache for fault tolerance
   - **Backup**: Daily JSON file backups or database snapshots (production)

#### Service Discovery
**Development**: Hardcoded localhost URLs and ngrok tunnel

**Production**:
- Internal service discovery via ECS service names or Kubernetes DNS
- External service URLs (Vapi, OpenAI) via environment variables
- Database connection strings via AWS Secrets Manager or env vars

#### Health Checks & Monitoring

**Health Endpoints**:
- **Liveness Probe**: GET `/health` → returns 200 OK if server is running
- **Readiness Probe**: GET `/health` → checks data loaded (employees > 0, vendors > 0, documents > 0)

**Monitoring Stack**:
- **Logs**: CloudWatch Logs or ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics**: CloudWatch Metrics (request count, latency, error rate) or Prometheus + Grafana
- **Alerts**: CloudWatch Alarms or PagerDuty
  - Critical: Server down >2 minutes, error rate >10%, response time >5 seconds
  - Warning: Error rate >5%, response time >3 seconds, memory usage >80%

**Distributed Tracing**: AWS X-Ray or Datadog for end-to-end request tracking across Vapi → MCP Server → OpenAI

---

**Document Version**: 1.0
**Last Updated**: 2025-01-13
**Maintained By**: IOG Procurement AI Development Team

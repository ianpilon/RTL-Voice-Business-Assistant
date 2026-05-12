# Component Diagram (Code/Implementation): Procurement Voice AI System

## Code Architecture Overview

The Procurement Voice AI System follows a **modular monolithic architecture** with clear separation of concerns organized around functional domains. The codebase is structured as a single Node.js application (`unified-server.js`) that integrates four distinct functional modules (Employee Context, Procurement RAG, Vendor Search, Request Validation) each operating independently with their own data sources. The architecture implements a **layered pattern** with API endpoints (controllers), business logic (services), and data access (repositories) clearly separated within each module. Configuration and deployment utilities are organized as standalone scripts in the project root, following a **convention-over-configuration** approach with environment-based settings managed through `.env` files.

**Primary Architectural Pattern**: Modular Monolith with Functional Domain Separation

**Key Organizational Principles**:
- Modules organized by business capability (employee, procurement policies, vendors, validation)
- Single unified server combines all modules for simplified deployment
- File-based data sources (JSON, Markdown) for development simplicity
- Stateless request handling for horizontal scalability
- Convention-based routing with consistent REST API patterns

## Module/Package Summary

### Core Application Modules

- **Unified MCP Server** (`/mcp-servers/unified-server.js`): Main application entry point that integrates all functional modules into a single Express.js server
- **Employee Context Module** (`/mcp-servers/employee-context/`): Employee lookup and profile management with fuzzy name matching
- **Procurement RAG Module** (`/mcp-servers/procurement-rag/`): Policy document retrieval using keyword-based RAG search algorithm
- **Vendor Context Module** (`/mcp-servers/vendor-context/`): Vendor discovery and contract history search
- **Request Validation Module** (embedded in unified server): Business logic for procurement request completeness validation

### Configuration & Deployment

- **Configuration Scripts** (`/configure-*.js`): Vapi AI platform configuration automation scripts
- **Environment Configuration** (`/.env`, `/.env.example`): Environment variables for API keys and server ports
- **Deployment Utilities** (`/start-mcp-servers.sh`): Shell scripts for server startup orchestration

### Data Sources

- **Employee Database** (`/mcp-servers/employee-context/employee-database.json`): JSON file storing 5 employee profiles
- **Vendor Database** (`/mcp-servers/vendor-context/vendor-database.json`): JSON file storing 12 approved vendor records
- **Policy Document Repository** (`/mcp-servers/procurement-rag/procurement-docs/*.md`): Markdown files containing 4 policy documents

### Testing & Utilities

- **API Test Scripts** (`/test-*.js`): Manual testing scripts for Vapi webhooks and function calls
- **System Prompts** (`/procurement-services-prompt.txt`): 3,800+ word AI system prompt configuration
- **Documentation** (`/ARCHITECTURE.md`, `/README.md`, `/BUILD_COMPLETE.md`): Comprehensive system documentation

## Component Diagram (Code Structure)

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

LAYOUT_WITH_LEGEND()

title Procurement Voice AI System - Code Component Structure

Container_Boundary(server, "Unified MCP Server (unified-server.js)") {

    Component(apiLayer, "API Layer", "Express.js Routes", "HTTP request handlers\n6 REST endpoints\nVapi webhook format")

    Container_Boundary(employeeModule, "Employee Context Module") {
        Component(employeeSvc, "Employee Service", "JavaScript Functions", "findEmployeeByName()\nFuzzy name matching\nExact + partial search")
        Component(employeeRepo, "Employee Repository", "File I/O", "loadEmployeeDB()\nReads JSON file\nIn-memory cache")
        ComponentDb(employeeDB, "employee-database.json", "JSON File", "5 employee records\nProfiles + history")
    }

    Container_Boundary(procurementModule, "Procurement RAG Module") {
        Component(ragSvc, "RAG Search Service", "JavaScript Functions", "searchDocuments()\nKeyword scoring\nTF-IDF-like algorithm")
        Component(docRepo, "Document Repository", "File I/O", "loadDocuments()\nMarkdown parsing\nSection chunking")
        ComponentDb(policyDocs, "procurement-docs/*.md", "Markdown Files", "4 policy documents\n146 text chunks")
    }

    Container_Boundary(vendorModule, "Vendor Context Module") {
        Component(vendorSvc, "Vendor Search Service", "JavaScript Functions", "searchVendors()\nWeighted keyword scoring\nSkill/project matching")
        Component(vendorRepo, "Vendor Repository", "File I/O", "loadVendorDB()\nReads JSON file\nIn-memory cache")
        ComponentDb(vendorDB, "vendor-database.json", "JSON File", "12 vendor records\nContracts + ratings")
    }

    Container_Boundary(validationModule, "Request Validation Module") {
        Component(validationSvc, "Validation Service", "JavaScript Functions", "validateProcurementRequest()\nRequired field checks\nBusiness rules")
    }

    Component(utilityLayer, "Utility Layer", "Express Middleware", "Health checks\nData reloading\nError handling")
}

Container_Boundary(config, "Configuration & Deployment Scripts") {
    Component(vapiConfig, "Vapi Configuration", "Node.js Scripts", "configure-complete-system.js\nAssistant setup\nFunction tool registration")
    Component(startupScripts, "Startup Scripts", "Shell Scripts", "start-mcp-servers.sh\nProcess management")
}

Container_Boundary(external, "External System Integrations") {
    System_Ext(vapi, "Vapi AI Platform", "Webhook caller\nHTTPS requests\nJSON payloads")
}

' API Layer relationships
Rel(vapi, apiLayer, "Sends webhooks", "HTTPS POST\nJSON")
Rel(apiLayer, employeeSvc, "Calls", "lookup_employee(name)")
Rel(apiLayer, ragSvc, "Calls", "searchDocuments(query)")
Rel(apiLayer, vendorSvc, "Calls", "searchVendors(query)")
Rel(apiLayer, validationSvc, "Calls", "validateProcurementRequest(fields)")
Rel(apiLayer, utilityLayer, "Uses", "Health checks, reload")

' Employee Module relationships
Rel(employeeSvc, employeeRepo, "Uses", "Data access")
Rel(employeeRepo, employeeDB, "Reads", "File I/O\nJSON.parse()")

' Procurement RAG Module relationships
Rel(ragSvc, docRepo, "Uses", "Data access")
Rel(docRepo, policyDocs, "Reads", "File I/O\nMarkdown parsing")

' Vendor Module relationships
Rel(vendorSvc, vendorRepo, "Uses", "Data access")
Rel(vendorRepo, vendorDB, "Reads", "File I/O\nJSON.parse()")

' Configuration relationships
Rel(vapiConfig, vapi, "Configures", "Vapi REST API\nAssistant updates")

SHOW_LEGEND()
@enduml
```

## Module & Component Details

### Modules/Packages

#### Unified MCP Server Module
- **Location**: `/mcp-servers/unified-server.js`
- **Purpose**: Central application entry point that integrates all functional modules into a single Express.js HTTP server
- **Key Components**:
  - Express app initialization
  - 6 API endpoint handlers (`/lookup-employee`, `/search-policies`, `/search-vendors`, `/validate-request`, `/health`, `/reload`)
  - Module integration logic
  - Server startup and data loading orchestration
- **Dependencies**:
  - Express.js (HTTP server framework)
  - dotenv (environment configuration)
  - Node.js fs/path (file system access)
  - All functional modules (employee, procurement, vendor, validation)
- **Lines of Code**: ~450 lines
- **Entry Point**: `node mcp-servers/unified-server.js`

---

#### Employee Context Module
- **Location**: `/mcp-servers/employee-context/`
- **Purpose**: Manage employee profiles and provide personalized context for procurement interactions
- **Key Components**:
  - `server.js`: Standalone server version (port 3002) - legacy, not used in production
  - `employee-database.json`: Data store with 5 employee records
  - Integrated into `unified-server.js` as embedded module
- **Dependencies**:
  - Node.js fs module for JSON file reading
  - JSON.parse for data deserialization
- **Data Model**: Employee objects with fields: id, name, firstName, lastName, email, team, department, title, location, manager, directReports, projects, specialties, procurementHistory, preferences, notes
- **Search Algorithm**: Two-pass exact/fuzzy name matching (exact match first, then substring match)

---

#### Procurement RAG Module
- **Location**: `/mcp-servers/procurement-rag/`
- **Purpose**: Search procurement policy documents using Retrieval Augmented Generation (RAG) with keyword-based scoring
- **Key Components**:
  - `server.js`: Standalone server version (port 3001) - legacy, not used in production
  - `procurement-docs/*.md`: 4 Markdown policy files (vendor-onboarding.md, contract-templates.md, payment-rules.md, procurement-faq.md)
  - Integrated into `unified-server.js` as embedded module
- **Dependencies**:
  - Node.js fs module for file reading
  - String manipulation for Markdown parsing
  - Regular expressions for section chunking
- **RAG Strategy**: Section-based chunking on `##` and `###` markdown headers to preserve semantic context
- **Search Algorithm**: TF-IDF-like keyword scoring with header boosting (headers get 5-10x weight multiplier)
- **Performance**: Sub-100ms search over 146 document chunks in memory

---

#### Vendor Context Module
- **Location**: `/mcp-servers/vendor-context/`
- **Purpose**: Search approved vendors by skills, past projects, and contract history
- **Key Components**:
  - `vendor-database.json`: Data store with 12 approved vendor records
  - Integrated into `unified-server.js` as embedded module
- **Dependencies**:
  - Node.js fs module for JSON file reading
  - JSON.parse for data deserialization
- **Data Model**: Vendor objects with fields: id, name, skills[], pastProjects[], averageDiscount, contracts[], contactInfo, status, notes, rating
- **Search Algorithm**: Weighted keyword scoring (vendor name: 10 points, skills match: 5 points, project match: 3 points)
- **Results**: Returns top 5 vendors sorted by relevance score

---

#### Request Validation Module
- **Location**: Embedded in `/mcp-servers/unified-server.js` (lines 344-389)
- **Purpose**: Validate procurement request completeness before routing to procurement team
- **Key Components**:
  - `validateProcurementRequest()` function: Business logic for field validation
  - `/validate-request` endpoint handler: API interface
- **Dependencies**: None (pure JavaScript validation logic)
- **Validation Rules**:
  - Required fields: budget_number, milestones, costs, description
  - Optional but recommended: deadline
- **Output**: Object with `missing` and `warnings` arrays listing incomplete fields
- **Performance**: <10ms validation time (simple boolean checks)

---

### Configuration & Deployment Scripts

#### configure-complete-system.js
- **Location**: `/configure-complete-system.js`
- **Purpose**: Automated configuration of Vapi AI assistant with all function tools and system prompt
- **Type**: Deployment utility script
- **Usage**: `node configure-complete-system.js https://your-ngrok-url.ngrok.app`
- **Key Operations**:
  - Reads `procurement-services-prompt.txt` (3,800+ word system prompt)
  - Configures 4 function tools (`lookup_employee`, `search_procurement_policies`, `search_vendor_history`, `validate_request`)
  - Updates Vapi assistant via REST API (PATCH request)
  - Sets webhook URLs to point to ngrok tunnel or production server
- **Dependencies**: node-fetch (HTTP client), dotenv (API keys), fs (file reading)
- **Lines of Code**: ~180 lines

---

#### start-mcp-servers.sh
- **Location**: `/start-mcp-servers.sh`
- **Purpose**: Shell script to start unified MCP server with proper environment variables
- **Type**: Deployment utility
- **Usage**: `./start-mcp-servers.sh`
- **Operations**: Launches `unified-server.js` on port 3001 with environment loaded from `.env`

---

### Key Components/Classes

#### API Layer (Express Routes)
- **Type**: HTTP Request Handlers (Controller Layer)
- **Purpose**: Receive webhook calls from Vapi, route to appropriate service, format responses in Vapi-compatible JSON structure
- **Location**: `/mcp-servers/unified-server.js` (lines 47-417)
- **Key Methods**:
  - `POST /lookup-employee`: Employee lookup endpoint (lines 47-98)
  - `POST /search-policies`: Policy search endpoint (lines 185-237)
  - `POST /search-vendors`: Vendor search endpoint (lines 294-338)
  - `POST /validate-request`: Request validation endpoint (lines 359-389)
  - `GET /health`: Health check endpoint (lines 395-403)
  - `POST /reload`: Data reload endpoint (lines 405-416)
- **Input Format**: Vapi webhook format with nested `message.toolCallList[0].function.arguments` structure
- **Output Format**: Vapi response format with `results[{toolCallId, result}]` structure
- **Error Handling**: Returns error messages in `result` field with 400 status codes for missing parameters
- **Dependencies**: Express.js (req, res objects), service layer functions

---

#### Employee Service (findEmployeeByName)
- **Type**: Business Logic Service
- **Purpose**: Search employee database by name using exact and fuzzy matching algorithms
- **Location**: `/mcp-servers/unified-server.js` (lines 26-44)
- **Key Methods**:
  - `findEmployeeByName(name)`: Two-pass search algorithm
    - Pass 1: Exact match on full name, first name, or last name (case-insensitive)
    - Pass 2: Substring match on any name field (fallback for partial names)
- **Input**: String name (first, last, or full name)
- **Output**: Employee object or `undefined` if not found
- **Performance**: O(n) linear search (acceptable for 5-100 employees); consider indexing for 1000+ employees
- **Dependencies**: Employee repository (in-memory database)

---

#### RAG Search Service (searchDocuments)
- **Type**: Business Logic Service
- **Purpose**: Search policy documents using keyword-based TF-IDF-like scoring algorithm
- **Location**: `/mcp-servers/unified-server.js` (lines 145-182)
- **Key Methods**:
  - `searchDocuments(query)`: Keyword extraction, scoring, ranking, and top-k selection
    - Extract keywords (words >3 characters)
    - Score documents based on keyword frequency
    - Boost score 5x for keywords in first line (likely header)
    - Boost score 10x for keywords in markdown headers (`##`)
    - Penalize very short chunks (<100 chars) by 0.5x multiplier
    - Return top 3 results sorted by score
- **Input**: String query (natural language question)
- **Output**: Array of top 3 document chunks with scores
- **Performance**: O(n*m) where n=documents (146), m=keywords (typically 2-5); ~50-100ms average
- **Scalability**: Current algorithm handles 500 chunks with <200ms latency; migrate to vector search for 10,000+ chunks
- **Dependencies**: Document repository (in-memory chunk array)

---

#### Vendor Search Service (searchVendors)
- **Type**: Business Logic Service
- **Purpose**: Search vendors using weighted keyword scoring across name, skills, and past projects
- **Location**: `/mcp-servers/unified-server.js` (lines 254-291)
- **Key Methods**:
  - `searchVendors(query)`: Multi-field weighted scoring algorithm
    - Extract keywords from query (words >3 characters)
    - Score vendor name match: 10 points for substring match
    - Score skills match: 5 points per keyword match in skills array
    - Score projects match: 3 points per keyword match in pastProjects array
    - Return top 5 vendors sorted by total score
- **Input**: String query (skill, project name, or vendor name)
- **Output**: Array of top 5 vendor objects with scores
- **Performance**: O(n*m) where n=vendors (12), m=keywords (typically 2-5); ~20-50ms average
- **Scalability**: Current algorithm handles 100 vendors efficiently; consider full-text search (Elasticsearch) for 1000+ vendors
- **Dependencies**: Vendor repository (in-memory database)

---

#### Request Validation Service (validateProcurementRequest)
- **Type**: Business Logic Service
- **Purpose**: Validate procurement request contains all required fields per business rules
- **Location**: `/mcp-servers/unified-server.js` (lines 344-356)
- **Key Methods**:
  - `validateProcurementRequest(fields)`: Field presence validation
    - Check required fields: budget_number, milestones, costs, description
    - Check optional fields: deadline (warning if missing)
    - Return object with `missing` array and `warnings` array
- **Input**: Object with procurement request fields
- **Output**: Validation result object `{missing: [], warnings: []}`
- **Business Rules**:
  - 4 required fields must be present for request to be "complete"
  - Deadline is optional but recommended (generates warning)
- **Performance**: <5ms (simple boolean checks)
- **Future Enhancements**: Add budget format validation, milestone date parsing, cost validation against budget
- **Dependencies**: None (pure JavaScript logic)

---

#### Employee Repository (loadEmployeeDB)
- **Type**: Data Access Layer
- **Purpose**: Load employee data from JSON file into memory at server startup
- **Location**: `/mcp-servers/unified-server.js` (lines 17-22)
- **Key Methods**:
  - `loadEmployeeDB()`: Synchronous file read and JSON parsing
    - Read `employee-database.json` file
    - Parse JSON into JavaScript object
    - Return `{employees: []}` structure
    - Return empty array if file doesn't exist (graceful degradation)
- **Data Source**: `/mcp-servers/employee-context/employee-database.json`
- **Caching Strategy**: Load once at startup, store in global `employeeDB` variable
- **Reload Mechanism**: Call `loadEmployeeDB()` again via `/reload` endpoint
- **Error Handling**: Returns empty employees array if file missing or parse fails
- **Performance**: ~5-10ms file read + parse for 5-record JSON file
- **Production Migration**: Replace with PostgreSQL queries or Redis cache

---

#### Document Repository (loadDocuments)
- **Type**: Data Access Layer
- **Purpose**: Load and chunk policy documents from Markdown files into searchable array
- **Location**: `/mcp-servers/unified-server.js` (lines 107-143)
- **Key Methods**:
  - `loadDocuments()`: File discovery, reading, parsing, and chunking
    - Scan `procurement-docs/` directory for `.txt` and `.md` files
    - Read each file content
    - Split on `##` headers (section boundaries)
    - Further split on `###` subheaders (subsection boundaries)
    - Create document chunk objects with id, filename, content
    - Store in global `documents` array (146 chunks)
- **Data Source**: `/mcp-servers/procurement-rag/procurement-docs/*.md` (4 files)
- **Chunking Strategy**: Semantic chunking on markdown headers to preserve context
- **Caching Strategy**: Load once at startup, store in global `documents` array
- **Reload Mechanism**: Call `loadDocuments()` again via `/reload` endpoint
- **Error Handling**: Logs error and continues if directory missing or file unreadable
- **Performance**: ~50-100ms for 4 files, ~1KB-10KB each
- **Production Migration**: Move to Elasticsearch or vector database (Pinecone) with embeddings

---

#### Vendor Repository (loadVendorDB)
- **Type**: Data Access Layer
- **Purpose**: Load vendor data from JSON file into memory at server startup
- **Location**: `/mcp-servers/unified-server.js` (lines 245-252)
- **Key Methods**:
  - `loadVendorDB()`: Synchronous file read and JSON parsing
    - Read `vendor-database.json` file
    - Parse JSON into JavaScript object
    - Return `{vendors: []}` structure
    - Return empty array if file doesn't exist
- **Data Source**: `/mcp-servers/vendor-context/vendor-database.json`
- **Caching Strategy**: Load once at startup, store in global `vendorDB` variable
- **Reload Mechanism**: Call `loadVendorDB()` again via `/reload` endpoint
- **Error Handling**: Returns empty vendors array if file missing or parse fails
- **Performance**: ~10-20ms file read + parse for 12-record JSON file
- **Production Migration**: Replace with PostgreSQL queries with full-text search indexes

---

#### Utility Layer (Health & Reload)
- **Type**: System Management Utilities
- **Purpose**: Provide health checks for monitoring and hot data reloading without server restart
- **Location**: `/mcp-servers/unified-server.js` (lines 395-416)
- **Key Endpoints**:
  - `GET /health`: Returns system status with data counts
    - Response: `{status: "ok", employees: 5, documents: 146, vendors: 12}`
    - Use Case: Load balancer health probes, Kubernetes liveness checks, monitoring dashboards
  - `POST /reload`: Reloads all data sources from disk
    - Calls `loadEmployeeDB()`, `loadVendorDB()`, `loadDocuments()`
    - Returns success status with updated counts
    - Use Case: Hot reload after updating JSON files or policy documents without server downtime
- **Performance**: Health check <5ms; reload ~100-200ms (file I/O + parsing)
- **Dependencies**: All repository loading functions

## Architectural Layers

### Layer 1 - API/Controller Layer
- **Purpose**: Handle HTTP requests from Vapi webhooks, extract parameters, invoke business logic, format responses
- **Components**:
  - Express.js route handlers (`app.post()`, `app.get()`)
  - Request parsing logic (extract parameters from Vapi webhook format)
  - Response formatting logic (Vapi-compatible JSON structure with `results` array)
  - Error handling middleware (400 for missing params, 500 for server errors)
- **Location**: `/mcp-servers/unified-server.js` (API endpoint definitions)
- **Dependencies**: Business Logic Layer (services)
- **Architectural Rule**: Controllers never contain business logic; they only orchestrate calls to services
- **Input**: HTTP POST requests with JSON body (Vapi webhook format)
- **Output**: HTTP 200 responses with JSON body (Vapi response format) or HTTP 400/500 with error messages

---

### Layer 2 - Business Logic/Service Layer
- **Purpose**: Implement core business logic for employee search, policy retrieval, vendor matching, and request validation
- **Components**:
  - `findEmployeeByName()`: Employee fuzzy search service
  - `searchDocuments()`: RAG search service with keyword scoring
  - `searchVendors()`: Vendor discovery service with weighted scoring
  - `validateProcurementRequest()`: Request completeness validation service
- **Location**: `/mcp-servers/unified-server.js` (service function definitions)
- **Dependencies**: Data Access Layer (repositories)
- **Architectural Rule**: Services contain all business logic and algorithms; they orchestrate data access but don't know about HTTP
- **Design Patterns**:
  - **Strategy Pattern**: Different search algorithms for employees (fuzzy match), policies (keyword scoring), vendors (weighted scoring)
  - **Template Method Pattern**: Common search pattern (extract keywords → score → sort → top-k) with algorithm variations

---

### Layer 3 - Data Access/Repository Layer
- **Purpose**: Abstract data source access, provide clean interfaces for loading and querying data
- **Components**:
  - `loadEmployeeDB()`: Employee data loader
  - `loadDocuments()`: Policy document loader and chunker
  - `loadVendorDB()`: Vendor data loader
- **Location**: `/mcp-servers/unified-server.js` (data loading functions)
- **Dependencies**: Data Storage Layer (file system)
- **Architectural Rule**: Repositories hide data source details (file-based, database, API) from services; provide simple query interfaces
- **Design Patterns**:
  - **Repository Pattern**: Abstract data access behind `load*()` functions
  - **Cache-Aside Pattern**: Load data once at startup, serve from memory cache
- **Future Refactoring**: Extract repositories into separate files (`employeeRepository.js`, `documentRepository.js`, `vendorRepository.js`)

---

### Layer 4 - Data Storage Layer
- **Purpose**: Persist data in JSON files and Markdown documents
- **Components**:
  - `employee-database.json`: Employee records (5 employees)
  - `vendor-database.json`: Vendor records (12 vendors)
  - `procurement-docs/*.md`: Policy documents (4 files, 146 chunks)
- **Location**: `/mcp-servers/*/` directories
- **Dependencies**: Node.js file system (fs module)
- **Architectural Rule**: Storage layer is read-only at runtime; updates require file edits + server reload
- **Production Migration Path**:
  - Replace JSON files with PostgreSQL tables (employees, vendors)
  - Replace Markdown files with Elasticsearch or vector database (policies)
  - Add write APIs for data updates (currently manual file editing)

---

## Dependencies & Relationships

### Internal Dependencies

#### Module Dependency Graph

```
Unified MCP Server (unified-server.js)
  ├── Employee Context Module
  │   ├── findEmployeeByName() → loadEmployeeDB()
  │   └── loadEmployeeDB() → employee-database.json
  │
  ├── Procurement RAG Module
  │   ├── searchDocuments() → loadDocuments()
  │   └── loadDocuments() → procurement-docs/*.md
  │
  ├── Vendor Context Module
  │   ├── searchVendors() → loadVendorDB()
  │   └── loadVendorDB() → vendor-database.json
  │
  └── Request Validation Module
      └── validateProcurementRequest() (no data dependencies)
```

**Dependency Flow**: Controllers → Services → Repositories → Data Files

**Key Insights**:
- All modules are **independent** (no cross-module dependencies)
- All modules share **common infrastructure** (Express.js server, environment config)
- Unified server acts as **integration point** for all modules
- No circular dependencies exist

---

#### API Layer → Service Layer

**Dependency**: Controllers call service functions to execute business logic

**Why**: Separation of concerns - controllers handle HTTP, services handle logic

**Examples**:
- `/lookup-employee` endpoint → `findEmployeeByName()` service
- `/search-policies` endpoint → `searchDocuments()` service
- `/search-vendors` endpoint → `searchVendors()` service
- `/validate-request` endpoint → `validateProcurementRequest()` service

---

#### Service Layer → Repository Layer

**Dependency**: Services use repository functions to access data

**Why**: Data access abstraction - services don't know about file formats or storage details

**Examples**:
- `findEmployeeByName()` → accesses global `employeeDB` variable populated by `loadEmployeeDB()`
- `searchDocuments()` → accesses global `documents` array populated by `loadDocuments()`
- `searchVendors()` → accesses global `vendorDB` variable populated by `loadVendorDB()`

---

#### Repository Layer → Storage Layer

**Dependency**: Repositories read data files using Node.js fs module

**Why**: Data persistence - repositories load data from disk into memory

**Examples**:
- `loadEmployeeDB()` → reads `employee-database.json` via `fs.readFileSync()`
- `loadDocuments()` → reads `procurement-docs/*.md` files via `fs.readdirSync()` + `fs.readFileSync()`
- `loadVendorDB()` → reads `vendor-database.json` via `fs.readFileSync()`

---

### External Dependencies

#### Express.js (v4.18.2)
- **Purpose**: Web application framework for routing, middleware, and HTTP server
- **Usage Extent**: Heavily used - foundation of entire API layer
- **Key Features Used**:
  - `express()`: App initialization
  - `app.use(express.json())`: JSON body parsing middleware
  - `app.post()`, `app.get()`: Route handlers
  - `app.listen()`: Server startup
  - `req.body`: Request body access
  - `res.json()`: JSON response formatting
- **Installed via**: npm (production dependency)

---

#### dotenv (v16.3.1)
- **Purpose**: Load environment variables from `.env` file into `process.env`
- **Usage Extent**: Moderately used - configuration management
- **Key Features Used**:
  - `require('dotenv').config()`: Load `.env` file at startup
  - `process.env.PORT`, `process.env.VAPI_API_KEY`, etc.: Access configuration
- **Configuration File**: `.env` (git-ignored), `.env.example` (template)
- **Installed via**: npm (production dependency)

---

#### Node.js Built-in Modules
- **fs (File System)**: File reading, directory scanning, file existence checks
  - Used by all repository functions for data loading
  - `fs.existsSync()`, `fs.readFileSync()`, `fs.readdirSync()`
- **path**: Cross-platform file path handling
  - Used for constructing absolute paths to data files
  - `path.join(__dirname, 'employee-database.json')`

---

#### node-fetch (Used in Configuration Scripts)
- **Purpose**: HTTP client for making REST API requests to Vapi platform
- **Usage Extent**: Used only in configuration scripts, not in runtime server
- **Key Usage**:
  - `configure-complete-system.js`: PATCH requests to Vapi API for assistant configuration
  - Sends system prompt and function tool definitions
- **Installed via**: npm (production dependency)

---

### Dependency Rules

#### Layered Architecture Dependency Rules

1. **One-Way Dependencies**: Dependencies flow in one direction only (Controllers → Services → Repositories → Storage)
   - **Rule**: Upper layers can depend on lower layers, but not vice versa
   - **Enforcement**: No imports/requires from lower layers to upper layers
   - **Benefit**: Changes to upper layers don't affect lower layers; testable in isolation

2. **No Skip-Layer Dependencies**: Controllers never directly access repositories or storage
   - **Rule**: Controllers must call services; services must call repositories
   - **Current State**: ✅ Enforced - all data access goes through service functions
   - **Benefit**: Clean separation of concerns, easier testing

3. **Module Independence**: Functional modules (employee, procurement, vendor, validation) don't depend on each other
   - **Rule**: No cross-module function calls or data sharing
   - **Current State**: ✅ Enforced - each module is self-contained
   - **Benefit**: Modules can be extracted into separate microservices in future

4. **Stateless Services**: Service functions don't maintain state between requests
   - **Rule**: Services operate on input parameters only; no instance variables
   - **Current State**: ✅ Enforced - all services are pure functions
   - **Benefit**: Thread-safe, horizontally scalable

---

#### Dependency Injection (Not Currently Implemented)

**Current Approach**: Direct function calls with global variables for data

**Future Improvement**:
- Pass data sources as parameters to services (dependency injection)
- Example: `findEmployeeByName(name, employeeDB)` instead of accessing global `employeeDB`
- Benefit: Easier unit testing with mock data sources

---

## Code Organization Principles

### Directory Structure

```
/procurement-voice-bot
│
├── /mcp-servers                          # Core application code
│   ├── unified-server.js                  # Main server (450 lines)
│   │
│   ├── /employee-context                  # Employee module
│   │   ├── server.js                      # Standalone server (legacy)
│   │   └── employee-database.json         # 5 employee records
│   │
│   ├── /procurement-rag                   # Procurement RAG module
│   │   ├── server.js                      # Standalone server (legacy)
│   │   └── /procurement-docs              # Policy documents
│   │       ├── vendor-onboarding.md       # Vendor policies
│   │       ├── contract-templates.md      # Contract guidance
│   │       ├── payment-rules.md           # Payment policies
│   │       └── procurement-faq.md         # Common questions
│   │
│   └── /vendor-context                    # Vendor module
│       └── vendor-database.json           # 12 vendor records
│
├── /node_modules                          # Dependencies (git-ignored)
│
├── configure-complete-system.js           # Vapi configuration script
├── start-mcp-servers.sh                   # Startup script
├── procurement-services-prompt.txt        # AI system prompt (3,800 words)
│
├── .env                                   # Environment variables (git-ignored)
├── .env.example                           # Environment template
├── .gitignore                             # Git ignore rules
│
├── package.json                           # npm dependencies
├── package-lock.json                      # Dependency lockfile
│
├── README.md                              # User documentation
├── ARCHITECTURE.md                        # Architecture documentation
├── CONTEXT_DIAGRAM.md                     # Context diagram
├── APP_DIAGRAM.md                         # Deployment diagram
└── COMPONENT_DIAGRAM.md                   # This file

# Legacy/Development Files (not used in production):
├── server.js, server-*.js                 # Old server iterations
├── test-*.js                              # Manual test scripts
├── configure-*.js                         # Old configuration scripts
└── *.json (memory, call logs)             # Development data
```

---

### Organization Strategy

**Primary Strategy**: **Organization by Business Capability (Functional Modules)**

The codebase is organized around four distinct business capabilities:
1. **Employee Context**: Everything related to employee lookup and profiles
2. **Procurement RAG**: Everything related to policy document search
3. **Vendor Context**: Everything related to vendor discovery
4. **Request Validation**: Everything related to request completeness checks

**Secondary Strategy**: **Layered Architecture Within Modules**

Within each module, code follows a layered structure:
- Controllers (API handlers) in `unified-server.js`
- Services (business logic) as functions in `unified-server.js`
- Repositories (data access) as functions in `unified-server.js`
- Data (storage) as separate JSON/Markdown files

**Reasoning**:
- Functional organization makes it easy to understand what each module does
- Modules are loosely coupled and can be extracted into separate services later
- Layered structure within modules provides clear separation of concerns
- Single-file implementation (`unified-server.js`) keeps deployment simple for current scale

**Future Refactoring Path**:
As the system grows, extract modules into separate files:
```
/mcp-servers
  /employee
    ├── controller.js (API handlers)
    ├── service.js (business logic)
    ├── repository.js (data access)
    └── data/
        └── employee-database.json
```

---

### Design Patterns Used

#### Repository Pattern
- **Where**: Data access layer (`loadEmployeeDB()`, `loadDocuments()`, `loadVendorDB()`)
- **How**: Abstract data source details behind simple loading functions
- **Benefit**: Services don't know about file formats, can swap storage implementations

#### Strategy Pattern
- **Where**: Search services (employee, policy, vendor)
- **How**: Each search service implements a different algorithm strategy
  - Employee: Exact/fuzzy name matching
  - Policy: Keyword-based RAG with header boosting
  - Vendor: Weighted multi-field scoring
- **Benefit**: Easily add new search strategies or swap algorithms

#### Factory Pattern (Implicit)
- **Where**: Response formatting in API layer
- **How**: Controllers create response objects in Vapi-compatible format
- **Benefit**: Centralized response format ensures consistency

#### Singleton Pattern (Implicit via Node.js Module Caching)
- **Where**: Global `employeeDB`, `vendorDB`, `documents` variables
- **How**: Node.js caches module state, so data loaded once at startup is shared across all requests
- **Benefit**: Avoid reloading data on every request; in-memory cache for fast access

---

### Testing Structure

**Current State**: Manual testing scripts, no automated test suite

**Test Scripts**:
- `test-vapi-endpoint.js`: Manual test for Vapi webhook format
- `test-function-call.js`: Manual test for function calling
- `test-vapi-format.js`: Manual test for response format

**Testing Gaps**:
- No unit tests for service functions
- No integration tests for API endpoints
- No end-to-end tests for call flows

**Recommended Testing Structure** (Future Implementation):
```
/tests
  /unit
    ├── employee.service.test.js       # Test findEmployeeByName()
    ├── rag.service.test.js            # Test searchDocuments()
    ├── vendor.service.test.js         # Test searchVendors()
    └── validation.service.test.js     # Test validateProcurementRequest()
  /integration
    ├── employee.api.test.js           # Test /lookup-employee endpoint
    ├── policy.api.test.js             # Test /search-policies endpoint
    ├── vendor.api.test.js             # Test /search-vendors endpoint
    └── validation.api.test.js         # Test /validate-request endpoint
  /e2e
    └── call-flow.test.js              # Test full Vapi webhook → response flow
```

**Testing Frameworks** (Recommendations):
- **Unit Tests**: Jest or Mocha + Chai
- **Integration Tests**: Supertest (for Express API testing)
- **Mocking**: Sinon.js (for mocking file I/O in tests)

---

## Code Quality & Maintainability Insights

### Boundaries

**Clear Module Boundaries**:
✅ Employee Context Module is completely independent from Procurement RAG and Vendor modules
✅ Each module has its own data source (no shared databases)
✅ Unified server acts as integration layer with clear boundaries

**API Boundary**:
✅ All external interactions go through REST API layer
✅ Controllers never contain business logic
✅ Vapi webhook format is isolated to controller layer (services receive plain parameters)

**Data Boundary**:
✅ Services never directly access files
✅ All file I/O is encapsulated in repository functions
✅ In-memory caching is transparent to services

**Potential Boundary Violations**:
⚠️ **Single-file implementation**: All modules in one file (`unified-server.js`, 450 lines)
  - **Impact**: Harder to navigate, test individual modules
  - **Recommendation**: Extract modules into separate files once >500 lines

⚠️ **Global state**: `employeeDB`, `vendorDB`, `documents` are global mutable variables
  - **Impact**: Not thread-safe (though Node.js is single-threaded), harder to test
  - **Recommendation**: Pass data as parameters to services (dependency injection)

---

### Extensibility

**How to Add New Features**:

1. **Add New Function Tool**:
   - Add service function to `unified-server.js` (e.g., `searchBudgetApprovals()`)
   - Add API endpoint handler (e.g., `app.post('/search-budgets')`)
   - Add data source if needed (e.g., `budget-database.json`)
   - Update `configure-complete-system.js` to register new function with Vapi
   - Update AI system prompt to use new function

2. **Add New Data Source**:
   - Create JSON file or Markdown files in appropriate module directory
   - Add repository function to load data (e.g., `loadBudgetDB()`)
   - Call loading function at server startup
   - Add to `/reload` endpoint for hot reloading

3. **Modify Search Algorithm**:
   - Update service function (e.g., replace keyword scoring with vector embeddings)
   - No changes to controller or repository needed (isolated change)

**Extension Points**:
- **Plugin Architecture**: Could extract modules as npm packages and load dynamically
- **Middleware Pipeline**: Add Express middleware for logging, authentication, rate limiting
- **Database Abstraction**: Replace file-based repositories with database adapters (PostgreSQL, MongoDB, Redis)

---

### Technical Debt

#### Circular Dependencies
✅ **None found** - dependency graph is acyclic (Controller → Service → Repository → Storage)

#### Tight Coupling Issues

⚠️ **Tight Coupling: Vapi Webhook Format**
- **Issue**: Controllers are tightly coupled to Vapi's nested webhook format (`message.toolCallList[0].function.arguments`)
- **Impact**: If Vapi changes format, must update all 4 endpoint handlers
- **Recommendation**: Extract parameter parsing into middleware function
  ```javascript
  function parseVapiRequest(req, res, next) {
    req.vapiParams = extractVapiParams(req.body);
    req.vapiToolCallId = extractToolCallId(req.body);
    next();
  }
  ```

⚠️ **Tight Coupling: Global Variables**
- **Issue**: Services depend on global mutable state (`employeeDB`, `vendorDB`, `documents`)
- **Impact**: Hard to test services in isolation without loading full data files
- **Recommendation**: Use dependency injection (pass data as parameters to services)

---

#### Code Duplication

⚠️ **Duplicated Parameter Extraction Logic**
- **Issue**: All 4 endpoint handlers have identical parameter extraction code (lines 52-58, 193-197, 298-300, 363)
  ```javascript
  let name = req.body.name
    || req.body.parameters?.name
    || req.body.message?.toolCalls?.[0]?.function?.arguments?.name
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.name;
  ```
- **Impact**: Code maintenance burden (must update 4 places for format changes)
- **Recommendation**: Extract into utility function or Express middleware

⚠️ **Duplicated Response Formatting Logic**
- **Issue**: All endpoints format responses identically (`results: [{toolCallId, result}]`)
- **Impact**: Inconsistent error handling, code repetition
- **Recommendation**: Create response builder utility
  ```javascript
  function vapiResponse(toolCallId, result) {
    return { results: [{ toolCallId, result }] };
  }
  ```

---

#### Missing Error Handling

⚠️ **Incomplete Error Handling**
- **Issue**: Repository functions don't handle file I/O errors gracefully
  - `loadEmployeeDB()` returns empty array if file missing (silent failure)
  - `loadDocuments()` logs error but continues (may load 0 documents)
- **Impact**: Silent failures make debugging difficult
- **Recommendation**: Add explicit error responses or startup validation
  ```javascript
  if (employeeDB.employees.length === 0) {
    console.error('⚠️  No employees loaded - check employee-database.json');
  }
  ```

⚠️ **No Request Validation**
- **Issue**: API endpoints don't validate request body structure
- **Impact**: Malformed requests can cause undefined behavior
- **Recommendation**: Add JSON schema validation (Joi, Ajv, or Zod)

---

#### Scalability Concerns

⚠️ **In-Memory Data Loading**
- **Issue**: All data loaded into memory at startup (146 policy chunks, 12 vendors, 5 employees)
- **Current Impact**: ~5-10MB memory usage (acceptable for current scale)
- **Future Impact**: 1000+ vendors or 10,000+ policy chunks would require ~500MB+ memory
- **Recommendation**:
  - Keep file-based approach for <1000 records
  - Migrate to database (PostgreSQL, Elasticsearch) for 1000+ records
  - Add pagination for search results

⚠️ **O(n) Search Algorithms**
- **Issue**: All search services use linear O(n) algorithms
- **Current Impact**: Fast enough for current data size (<100ms)
- **Future Impact**: 1000+ records would cause 1-2 second response times
- **Recommendation**:
  - Add indexes (database B-tree indexes or in-memory hash maps)
  - Use full-text search (Elasticsearch) or vector search (Pinecone) for policy documents

---

#### Code Organization Concerns

⚠️ **Monolithic Server File**
- **Issue**: All modules in single 450-line file (`unified-server.js`)
- **Impact**: Hard to navigate, hard to test individual modules, merge conflicts
- **Recommendation**: Extract into separate files at 500+ lines
  ```
  /mcp-servers
    ├── server.js (main entry point)
    ├── /employee
    │   ├── controller.js
    │   ├── service.js
    │   └── repository.js
    ├── /procurement
    │   ├── controller.js
    │   ├── service.js
    │   └── repository.js
    └── /vendor
        ├── controller.js
        ├── service.js
        └── repository.js
  ```

⚠️ **Legacy Code Files**
- **Issue**: Multiple old server files (`server-vapi.js`, `server-memory-simple.js`, etc.) still present in root
- **Impact**: Confusing for new developers, clutter
- **Recommendation**: Move to `/archive` directory or delete if not needed

---

**Document Version**: 1.0
**Last Updated**: 2025-01-13
**Maintained By**: IOG Procurement AI Development Team

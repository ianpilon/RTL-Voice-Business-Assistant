# Context Diagram: Procurement Voice AI System

## Executive Summary

The Procurement Voice AI System is an intelligent voice assistant that handles incoming phone calls from internal departments at Input Output Global (IOG), automating the procurement request intake process. The system validates procurement requests to ensure completeness, answers policy questions through self-service, and provides vendor recommendations—all without human intervention. By preventing incomplete requests and answering repetitive questions, the system eliminates 50% of time wasted by the procurement team on administrative tasks, allowing them to focus on strategic procurement activities.

## System Overview

**System Name:** Procurement Voice AI System

**Purpose:** Automate procurement request intake and validation for Input Output Global's internal departments

**Key Business Capabilities:**
- **Request Validation**: Ensures all procurement requests contain required information (budget, milestones, costs, description) before routing to the procurement team
- **Self-Service Policy Answers**: Provides instant answers to questions about vendor onboarding, contract templates, payment rules, and approval timelines
- **Vendor Discovery**: Helps internal teams find approved vendors based on skills, past projects, and performance history
- **Employee Recognition**: Personalizes interactions by recognizing team members and their past procurement activities

**Target Users:** Internal IOG employees across Marketing, Engineering, Finance, and Operations departments who need to submit procurement requests or get procurement-related information

**Business Value:** Reduces procurement team administrative burden by 50%, accelerates request processing time, and improves request quality through upfront validation

## Context Diagram

```plantuml
@startuml
!theme plain
skinparam rectangle {
    BackgroundColor<<system>> LightBlue
    BorderColor<<system>> Blue
}
skinparam actor {
    BackgroundColor LightGreen
    BorderColor DarkGreen
}
skinparam cloud {
    BackgroundColor LightYellow
    BorderColor Orange
}
skinparam database {
    BackgroundColor LightCoral
    BorderColor DarkRed
}

' Define the main system
rectangle "Procurement Voice AI System" as System <<system>> {
    note right
        * Validates procurement requests
        * Answers policy questions
        * Recommends vendors
        * Recognizes employees
    end note
}

' Define human actors (users)
actor "Marketing Team Member" as Marketing
actor "Engineering Team Member" as Engineering
actor "Finance Team Member" as Finance
actor "Operations Team Member" as Operations
actor "Procurement Manager\n(Andrea Smith)" as ProcurementMgr

' Define external systems and services
cloud "Vapi AI Platform" as Vapi {
    note bottom
        Voice telephony platform
        Speech-to-text (Deepgram)
        Text-to-speech (PlayHT)
    end note
}

cloud "OpenAI GPT-4" as OpenAI {
    note bottom
        Natural language
        understanding and
        conversation management
    end note
}

database "Employee Database" as EmployeeDB {
    note bottom
        5 IOG employees with
        roles, preferences, and
        procurement history
    end note
}

database "Vendor Database" as VendorDB {
    note bottom
        12 approved vendors with
        skills, projects, pricing,
        and performance ratings
    end note
}

database "Policy Documents" as PolicyDocs {
    note bottom
        4 policy documents:
        - Vendor onboarding
        - Contract templates
        - Payment rules
        - Procurement FAQ
    end note
}

' Define relationships and interactions
Marketing --> System : "Calls to submit\nmarketing procurement\nrequests"
Engineering --> System : "Calls to find\ntechnical vendors\n(e.g., Rust developers)"
Finance --> System : "Calls to inquire\nabout payment\nterm policies"
Operations --> System : "Calls to request\noperational services"

System --> ProcurementMgr : "Routes validated\nprocurement requests"

System --> Vapi : "Receives phone calls\nvia +1 (930) 254-9264"
Vapi --> System : "Provides voice transcription\nand text-to-speech"

System --> OpenAI : "Requests AI processing\nfor conversation logic"
OpenAI --> System : "Returns intelligent\nresponses and decisions"

System --> EmployeeDB : "Looks up employee\ncontext and history"
System --> VendorDB : "Searches for vendors\nby skills/projects"
System --> PolicyDocs : "Retrieves policy\ninformation via RAG"

@enduml
```

## Actors & External Systems

### Primary Actors (Users)

- **Marketing Team Members**: Internal IOG marketing department employees who submit procurement requests for marketing services such as advertising campaigns, creative agencies, marketing automation tools, and content creation services. They use the system to validate their requests before submission and to find approved marketing vendors.

- **Engineering Team Members**: Internal IOG engineering department employees who submit procurement requests for technical services such as software development, infrastructure management, blockchain consulting, and technical contractors. They frequently search for vendors with specific technical skills (e.g., Rust developers, DevOps specialists).

- **Finance Team Members**: Internal IOG finance department employees who need clarification on procurement policies, especially regarding payment terms, budget approval thresholds, and contract financial structures. They use the system to understand payment rules and approval workflows.

- **Operations Team Members**: Internal IOG operations department employees who submit procurement requests for operational services such as office supplies, facility management, administrative support, and general business services.

- **Procurement Manager (Andrea Smith)**: The manager of IOG's procurement team who receives validated, complete procurement requests from the voice AI system. The primary beneficiary of the system's time-saving capabilities, as the system prevents incomplete requests from reaching her team.

### External Systems & Services

- **Vapi AI Platform**: Cloud-based voice telephony and AI platform that provides the phone number (+1 930-254-9264), manages incoming calls, converts speech to text using Deepgram, synthesizes AI responses to speech using PlayHT, and orchestrates the conversation flow. Vapi acts as the voice interface between callers and the AI system.

- **OpenAI GPT-4**: Large language model that provides natural language understanding and generation capabilities. The system sends conversation context to GPT-4, which determines caller intent, decides which functions to call, and generates natural conversational responses. GPT-4 operates with a custom 3,800+ word system prompt that defines the procurement assistant's behavior and validation logic.

- **Employee Database**: JSON-based data store containing profiles of 5 IOG employees including their names, departments, titles, roles, past procurement interactions, communication preferences, and work context. The system queries this database to personalize interactions when callers identify themselves.

- **Vendor Database**: JSON-based data store containing information about 12 approved IOG vendors including vendor names, skills/capabilities, past project history, contract values, pricing discounts, performance ratings, and contact information. The system searches this database to recommend vendors based on skills or past project experience.

- **Policy Documents Repository**: Collection of 4 markdown-formatted policy documents (totaling 146 text chunks) covering vendor onboarding procedures, contract template guidance, payment term rules, and frequently asked procurement questions. The system uses Retrieval Augmented Generation (RAG) to search these documents and provide accurate policy answers to callers.

## Key Interactions & Data Flows

### Procurement Request Submission
**Flow:** Internal team member → Voice AI System → Procurement Manager

**Business Value:** Ensures 100% of procurement requests submitted to the procurement team are complete with all required fields (budget number, milestones, cost breakdown, project description), eliminating back-and-forth communication and saving 3-5 days per request.

**Data:** Budget codes, project milestones, cost estimates, delivery timelines, vendor preferences

### Vendor Discovery & Recommendation
**Flow:** Internal team member → Voice AI System → Vendor Database → Voice AI System → Internal team member

**Business Value:** Enables self-service vendor discovery without requiring procurement team involvement. Teams can instantly find approved vendors matching their specific skill requirements or past project experience, accelerating vendor selection.

**Data:** Vendor skills, past project names, pricing discounts, performance ratings, contact information

### Policy Question Answering
**Flow:** Internal team member → Voice AI System → Policy Documents → Voice AI System → Internal team member

**Business Value:** Provides instant self-service answers to common procurement questions (onboarding process, contract templates, payment rules, approval timelines) without requiring human intervention, eliminating email exchanges and reducing procurement team interruptions.

**Data:** Vendor onboarding steps, contract template selection criteria, payment term policies, approval thresholds, processing timelines

### Employee Recognition & Personalization
**Flow:** Internal team member → Voice AI System → Employee Database → Voice AI System

**Business Value:** Personalizes interactions by recognizing callers and accessing their past procurement history, enabling more relevant recommendations and faster service based on their department, preferences, and previous interactions.

**Data:** Employee names, departments, titles, past procurement requests, communication preferences

### AI-Powered Conversation Management
**Flow:** Voice AI System → OpenAI GPT-4 → Voice AI System

**Business Value:** Provides natural, conversational interactions that guide callers through request submission, ask clarifying questions, and deliver information in an easy-to-understand format without requiring technical knowledge or form-filling.

**Data:** Conversation context, caller utterances, function call decisions, natural language responses

### Voice Telephony & Transcription
**Flow:** Internal team member → Vapi Platform → Voice AI System

**Business Value:** Provides accessible voice-based interface that requires no training or special software—any employee can simply call a phone number to interact with the system using their natural voice, making the service universally accessible across the organization.

**Data:** Voice audio, speech transcriptions, synthesized speech responses

## System Boundaries

### Inside the System Boundary
(What the IOG procurement team builds and maintains)

- **Unified MCP Server**: Core Node.js/Express application running on port 3001 that handles all business logic
- **Employee Lookup Functionality**: Code that searches and retrieves employee information from the database
- **Vendor Search Engine**: Keyword-based search algorithm that matches vendor skills and projects to queries
- **Policy RAG System**: Document retrieval system that searches policy documents using keyword scoring
- **Request Validation Logic**: Business rules that check procurement request completeness
- **Employee Database**: JSON file containing IOG employee profiles and procurement history
- **Vendor Database**: JSON file containing approved vendor information and contract history
- **Policy Documents**: Markdown files containing procurement policies, procedures, and guidelines
- **System Prompt Configuration**: 3,800+ word instruction set that defines AI behavior and validation rules
- **API Endpoints**: REST endpoints that expose system functionality to external AI services
- **Data Management Tools**: Scripts for loading, validating, and reloading data sources

### Outside the System Boundary
(External dependencies and services)

- **Vapi AI Platform**: Third-party cloud service that provides telephony infrastructure, speech recognition, and text-to-speech capabilities (commercial SaaS)
- **OpenAI GPT-4**: Third-party large language model API that provides natural language understanding and generation (commercial API)
- **Deepgram Speech-to-Text**: Third-party speech recognition service accessed via Vapi platform (commercial API)
- **PlayHT Text-to-Speech**: Third-party voice synthesis service accessed via Vapi platform (commercial API)
- **Ngrok Tunnel**: Development tool for exposing local server to internet during development (third-party service)
- **Phone Network (PSTN)**: Public telephone network infrastructure that delivers calls to the Vapi platform
- **Internal Callers' Devices**: Phones, mobile devices, or computers used by IOG employees to make calls
- **Future Integrations**: JIRA (ticket creation), Tract (vendor management), Finance API (budget validation) - planned but not yet implemented

---

**Document Version:** 1.0
**Last Updated:** 2025-01-13
**Maintained By:** IOG Procurement AI Development Team

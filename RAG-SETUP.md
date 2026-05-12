# Local RAG Setup for IOG Legal Services

This setup keeps all your legal documents on your local server - Vapi will call your server to search them, but never hosts the files.

## Architecture

```
Caller → Vapi → Your Local Server → Search Documents → Return Results → Vapi → Caller
```

## Setup Steps

### 1. Start the RAG Server

```bash
node server-legal-rag.js
```

This will:
- Start a server on port 3001 (or your PORT from .env)
- Create a `./legal-docs/` directory
- Create a sample policy document
- Load all .txt and .md files from the directory

### 2. Add Your Legal Documents

Add your legal policy documents to the `./legal-docs/` directory:

```bash
./legal-docs/
  ├── contract-policies.txt
  ├── data-privacy-policy.txt
  ├── employment-policies.txt
  └── vendor-policies.txt
```

Supported formats: `.txt`, `.md`

After adding documents, reload them:
```bash
curl -X POST http://localhost:3001/reload-documents
```

### 3. Expose Your Server with ngrok

```bash
ngrok http 3001
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

### 4. Configure Vapi to Use Your RAG

```bash
node configure-vapi-rag.js https://your-ngrok-url.ngrok.io
```

This will:
- Add a `search_legal_policies` function to your assistant
- Configure it to call your local server
- Update the system prompt with RAG instructions

### 5. Test It!

Call your Vapi number: **+1 (716) 302-2410**

Ask questions like:
- "What's the approval process for contracts over $100k?"
- "What are the data privacy requirements?"
- "How do I onboard a new vendor?"

The assistant will search your local documents and provide answers!

## How It Works

1. **Caller asks a question** about policies
2. **Vapi's AI decides** it needs to search policies
3. **Vapi calls your server** at `/search-policies` with the query
4. **Your server searches** local documents using keyword matching
5. **Returns top 3 relevant sections** to Vapi
6. **Vapi uses that info** to answer the caller

## Upgrading the Search

The current implementation uses simple keyword matching. You can upgrade to:

### Vector Embeddings (Better Search)
- Use OpenAI embeddings
- Store in a vector database (Pinecone, Weaviate, ChromaDB)
- Semantic search instead of keyword matching

### Full-Text Search
- Use Elasticsearch or Algolia
- Better ranking and relevance

### PDF Support
- Add `pdf-parse` npm package
- Extract text from PDFs automatically

## API Endpoints

### POST /search-policies
Search for relevant policies
```json
{
  "query": "contract approval process"
}
```

Response:
```json
{
  "found": true,
  "content": "Policy content here...",
  "sources": ["contract-policies.txt"]
}
```

### GET /health
Check server status

### POST /reload-documents
Reload all documents from ./legal-docs/

## Security Notes

- Your documents never leave your server
- Vapi only receives search results, not full documents
- Use ngrok's authentication features for production
- Consider adding API key authentication to your endpoints
- Monitor ngrok logs for all requests

## Troubleshooting

**"No relevant policies found"**
- Check that documents are in ./legal-docs/
- Reload documents: POST /reload-documents
- Check server logs for loaded documents

**Vapi not calling your server**
- Verify ngrok is running
- Check ngrok URL is correct in Vapi config
- Test endpoint directly: `curl -X POST http://localhost:3001/search-policies -H "Content-Type: application/json" -d '{"query":"contract"}'`

**Server not responding**
- Check server is running on correct port
- Verify firewall isn't blocking ngrok
- Check ngrok dashboard for request logs

## Next Steps

1. Add your real legal documents to `./legal-docs/`
2. Test the search functionality
3. Consider upgrading to vector embeddings for better search
4. Add more document formats (PDF, DOCX)
5. Implement access logging for compliance

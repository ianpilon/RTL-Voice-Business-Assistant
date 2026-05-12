require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Simple in-memory document store
// You can replace this with a proper vector database later (like Pinecone, Weaviate, etc.)
let documents = [];

// Load documents from a directory
function loadDocuments(dirPath = './legal-docs') {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created ${dirPath} directory - add your legal documents here`);

      // Create a sample policy document
      const samplePolicy = `# IOG Legal Policies

## Contract Approval Policy

### Contracts under $10,000
- Business unit manager approval required
- Legal review optional but recommended
- Standard template must be used

### Contracts $10,000 - $100,000
- VP approval required
- Legal review mandatory
- 5 business day review period

### Contracts over $100,000
- C-level approval required
- Full legal review mandatory
- 10 business day review period
- Board notification may be required

## Data Privacy Policy

All business units must comply with:
- Obtain consent before collecting personal data
- Follow GDPR guidelines for EU customers
- Report data breaches to legal within 24 hours
- Complete annual privacy training

## Vendor Onboarding Process

Before engaging a new vendor:
1. Complete vendor risk assessment
2. Obtain W-9 or W-8 form
3. Legal review of vendor agreement
4. Information security review if handling data
5. Add to approved vendor list

## Confidentiality Requirements

- All employees must sign NDA upon hiring
- Customer NDAs required for sensitive projects
- Confidential information must not be shared externally
- Report potential breaches immediately to legal

## Employment Policies

### Termination Process
- HR consultation required
- Legal review for cause terminations
- Documentation must be complete
- Final approval from VP or above

### Non-Compete Agreements
- Required for senior leadership roles
- State-specific terms apply
- Legal review mandatory before signing
`;

      fs.writeFileSync(path.join(dirPath, 'sample-policy.txt'), samplePolicy);
      console.log('📄 Created sample policy document');
    }

    const files = fs.readdirSync(dirPath);
    documents = [];

    files.forEach(file => {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf8');

        // Split into chunks (simple chunking by paragraphs)
        const chunks = content.split('\n\n').filter(chunk => chunk.trim().length > 0);

        chunks.forEach((chunk, index) => {
          documents.push({
            id: `${file}-chunk-${index}`,
            filename: file,
            content: chunk.trim()
          });
        });
      }
    });

    console.log(`✅ Loaded ${documents.length} document chunks from ${files.length} files`);
  } catch (error) {
    console.error('Error loading documents:', error.message);
  }
}

// Simple keyword-based search (you can upgrade to vector embeddings later)
function searchDocuments(query) {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(' ').filter(word => word.length > 3);

  const results = documents.map(doc => {
    let score = 0;
    const contentLower = doc.content.toLowerCase();

    // Score based on keyword matches
    keywords.forEach(keyword => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += matches;
    });

    return { ...doc, score };
  })
  .filter(doc => doc.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3); // Return top 3 results

  return results;
}

// Vapi will call this endpoint when the assistant needs policy information
app.post('/search-policies', (req, res) => {
  const { query } = req.body;

  console.log(`\n🔍 Policy search request: "${query}"`);

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const results = searchDocuments(query);

  if (results.length === 0) {
    console.log('   No relevant policies found');
    return res.json({
      found: false,
      message: 'No relevant policies found for this query.'
    });
  }

  // Combine the top results
  const combinedContent = results.map(r => r.content).join('\n\n');

  console.log(`   Found ${results.length} relevant sections`);
  console.log(`   From files: ${[...new Set(results.map(r => r.filename))].join(', ')}`);

  res.json({
    found: true,
    content: combinedContent,
    sources: [...new Set(results.map(r => r.filename))]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    documents: documents.length,
    message: 'Legal RAG server is running'
  });
});

// Endpoint to reload documents
app.post('/reload-documents', (req, res) => {
  loadDocuments();
  res.json({
    success: true,
    documents: documents.length,
    message: 'Documents reloaded'
  });
});

// Load documents on startup
loadDocuments();

app.listen(port, () => {
  console.log('\n🚀 IOG Legal RAG Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log(`🔍 Search endpoint: POST /search-policies`);
  console.log(`💚 Health check: GET /health`);
  console.log(`🔄 Reload docs: POST /reload-documents`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📚 Document Storage:');
  console.log(`   Location: ./legal-docs/`);
  console.log(`   Loaded: ${documents.length} chunks`);
  console.log(`   Supported formats: .txt, .md`);
  console.log('\n💡 Add your legal documents to ./legal-docs/ directory');
  console.log('   Then POST to /reload-documents to refresh\n');
});

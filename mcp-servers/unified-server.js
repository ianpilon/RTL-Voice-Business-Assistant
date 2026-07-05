require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the dashboard UI (index.html at repo root) same-origin.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

// ============================================
// ASSET (REEFER TRAILER) FUNCTIONALITY
// ============================================

const ASSET_DB_PATH = path.join(__dirname, 'asset-context/asset-database.json');

function loadAssetDB() {
  if (fs.existsSync(ASSET_DB_PATH)) {
    return JSON.parse(fs.readFileSync(ASSET_DB_PATH, 'utf8'));
  }
  return { trailers: [] };
}

let assetDB = loadAssetDB();

function normalizeUnit(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function findTrailerByUnitNumber(unitNumber) {
  const target = normalizeUnit(unitNumber);
  if (!target) return null;

  let trailer = assetDB.trailers.find(t => normalizeUnit(t.unit_number) === target);
  if (trailer) return trailer;

  trailer = assetDB.trailers.find(t => normalizeUnit(t.unit_number).endsWith(target));
  if (trailer) return trailer;

  return assetDB.trailers.find(t => normalizeUnit(t.unit_number).includes(target)) || null;
}

const STATUS_PHRASE = {
  in_yard: 'in the Toronto yard, ready for dispatch',
  on_road: 'currently on the road',
  leased: 'out on lease',
  in_shop: 'in the shop for service'
};

function describeTrailer(t) {
  const phrase = STATUS_PHRASE[t.status] || `marked as ${t.status}`;
  let line = `Trailer ${t.unit_number} (${t.year} ${t.make} ${t.model}, ${t.reefer_unit}) is ${phrase} at ${t.location}.`;
  if (t.status === 'on_road' && t.current_driver) {
    line += ` Driver is ${t.current_driver} hauling ${t.current_load}.`;
  } else if (t.status === 'leased' && t.leased_to) {
    line += ` Leased to ${t.leased_to} through ${t.lease_end_date}.`;
  } else if (t.status === 'in_shop') {
    line += ` ${t.notes}`;
  }
  line += ` Mileage ${t.mileage.toLocaleString()}; next service due ${t.next_service_due}.`;
  return line;
}

// Trailer / asset lookup endpoint
app.post('/lookup-asset', (req, res) => {
  console.log('\n📥 Full request body:', JSON.stringify(req.body, null, 2));

  const toolCallId = req.body.message?.toolCallList?.[0]?.id;

  let unitNumber = req.body.unit_number
    || req.body.parameters?.unit_number
    || req.body.message?.toolCalls?.[0]?.function?.arguments?.unit_number
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.unit_number;

  console.log(`\n🚛 Trailer lookup: "${unitNumber}"`);
  console.log(`   Tool Call ID: ${toolCallId}`);

  if (!unitNumber) {
    console.log('❌ No unit_number found in request body');
    console.log('Available keys:', Object.keys(req.body));
    return res.status(400).json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: 'Error: unit_number parameter is required'
      }]
    });
  }

  const trailer = findTrailerByUnitNumber(unitNumber);

  if (!trailer) {
    console.log('   ❌ Not found');
    return res.json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: `I couldn't find a trailer matching "${unitNumber}" in our fleet.`
      }]
    });
  }

  console.log(`   ✅ Found: ${trailer.unit_number} (${trailer.status})`);

  res.json({
    results: [{
      toolCallId: toolCallId || 'unknown',
      result: describeTrailer(trailer)
    }]
  });
});

// ============================================
// POLICY SEARCH FUNCTIONALITY
// ============================================

const POLICY_DOCS_PATH = path.join(__dirname, 'policy-rag');
let documents = [];

function loadDocuments() {
  try {
    if (!fs.existsSync(POLICY_DOCS_PATH)) {
      console.log(`⚠️  Policy docs directory not found: ${POLICY_DOCS_PATH}`);
      return;
    }

    const files = fs.readdirSync(POLICY_DOCS_PATH);
    documents = [];

    files.forEach(file => {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(POLICY_DOCS_PATH, file), 'utf8');

        // Split on ## headers to create clean section boundaries
        const sections = content.split(/(?=##\s)/g).filter(section => section.trim().length > 0);

        sections.forEach((section, index) => {
          // Further split large sections on ### subheaders
          const subsections = section.split(/(?=###\s)/g).filter(sub => sub.trim().length > 0);

          subsections.forEach((subsection, subIndex) => {
            documents.push({
              id: `${file}-section-${index}-${subIndex}`,
              filename: file,
              content: subsection.trim()
            });
          });
        });
      }
    });

    console.log(`✅ Loaded ${documents.length} document chunks from ${files.length} files`);
  } catch (error) {
    console.error('Error loading documents:', error.message);
  }
}

function searchDocuments(query) {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(' ').filter(word => word.length > 3);

  const results = documents.map(doc => {
    let score = 0;
    const contentLower = doc.content.toLowerCase();
    const firstLine = doc.content.split('\n')[0].toLowerCase();

    // Count keyword matches in content
    keywords.forEach(keyword => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += matches;

      // Boost score if keyword appears in first line (likely a header)
      if (firstLine.includes(keyword)) {
        score += 5;
      }

      // Boost score if this looks like a section header with matching keyword
      if (firstLine.startsWith('##') && firstLine.includes(keyword)) {
        score += 10;
      }
    });

    // Penalize very short chunks (likely incomplete)
    if (doc.content.length < 100) {
      score = score * 0.5;
    }

    return { ...doc, score };
  })
  .filter(doc => doc.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

  return results;
}

// Policy search endpoint
app.post('/search-policies', (req, res) => {
  // Log the full request for debugging
  console.log('\n📥 Full request body:', JSON.stringify(req.body, null, 2));

  // Extract toolCallId for Vapi response format
  const toolCallId = req.body.message?.toolCallList?.[0]?.id;

  // Vapi might send parameters in different formats
  // Try: req.body.query, req.body.message.toolCalls[0].function.arguments.query, etc.
  let query = req.body.query
    || req.body.parameters?.query
    || req.body.message?.toolCalls?.[0]?.function?.arguments?.query
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.query;

  console.log(`\n🔍 Policy search: "${query}"`);
  console.log(`   Tool Call ID: ${toolCallId}`);

  if (!query) {
    console.log('❌ No query found in request body');
    console.log('Available keys:', Object.keys(req.body));
    return res.status(400).json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: 'Error: Query parameter is required'
      }]
    });
  }

  const results = searchDocuments(query);

  if (results.length === 0) {
    console.log('   ❌ No relevant policies found');
    return res.json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: 'No relevant policies found for this query. I recommend connecting you with our legal team for assistance.'
      }]
    });
  }

  // Combine results into single-line text (Vapi requirement: no line breaks)
  const combinedContent = results.map(r => r.content).join(' ');

  console.log(`   ✅ Found ${results.length} relevant sections`);
  console.log(`   Files: ${[...new Set(results.map(r => r.filename))].join(', ')}`);

  res.json({
    results: [{
      toolCallId: toolCallId || 'unknown',
      result: combinedContent
    }]
  });
});

// ============================================
// VENDOR DATABASE FUNCTIONALITY
// ============================================

const VENDOR_DB_PATH = path.join(__dirname, 'vendor-context/vendor-database.json');

function loadVendorDB() {
  if (fs.existsSync(VENDOR_DB_PATH)) {
    return JSON.parse(fs.readFileSync(VENDOR_DB_PATH, 'utf8'));
  }
  return { vendors: [] };
}

let vendorDB = loadVendorDB();

function searchVendors(query) {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(' ').filter(word => word.length > 3);

  const results = vendorDB.vendors.map(vendor => {
    let score = 0;

    // Search in vendor name
    if (vendor.name.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Search in skills
    vendor.skills.forEach(skill => {
      keywords.forEach(keyword => {
        if (skill.toLowerCase().includes(keyword)) {
          score += 5;
        }
      });
    });

    // Search in past projects
    vendor.pastProjects.forEach(project => {
      keywords.forEach(keyword => {
        if (project.toLowerCase().includes(keyword)) {
          score += 3;
        }
      });
    });

    return { ...vendor, score };
  })
  .filter(v => v.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

  return results;
}

// Vendor search endpoint
app.post('/search-vendors', (req, res) => {
  console.log('\n📥 Vendor search request:', JSON.stringify(req.body, null, 2));

  const toolCallId = req.body.message?.toolCallList?.[0]?.id;
  let query = req.body.query
    || req.body.parameters?.query
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.query;

  console.log(`\n🔍 Vendor search: "${query}"`);
  console.log(`   Tool Call ID: ${toolCallId}`);

  if (!query) {
    return res.status(400).json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: 'Error: Query parameter is required'
      }]
    });
  }

  const results = searchVendors(query);

  if (results.length === 0) {
    return res.json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: 'No vendors found matching that criteria. I can help you research new vendors if needed.'
      }]
    });
  }

  // Format results as readable text
  const resultText = results.map(v =>
    `${v.name}: ${v.skills.join(', ')}. Past projects: ${v.pastProjects.join(', ')}. Average discount: ${v.averageDiscount}. Rating: ${v.rating}.`
  ).join(' ');

  console.log(`   ✅ Found ${results.length} vendors`);

  res.json({
    results: [{
      toolCallId: toolCallId || 'unknown',
      result: resultText
    }]
  });
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    trailers: assetDB.trailers.length,
    documents: documents.length,
    vendors: vendorDB.vendors.length,
    message: 'RTL MCP server is running'
  });
});

// ============================================
// DATA BROWSER ENDPOINTS (read-only views of what the AI sees)
// ============================================

app.get('/data/trailers', (req, res) => {
  res.json({ trailers: assetDB.trailers });
});

app.get('/data/vendors', (req, res) => {
  res.json({ vendors: vendorDB.vendors });
});

app.get('/data/policies', (req, res) => {
  const grouped = {};
  for (const doc of documents) {
    if (!grouped[doc.filename]) grouped[doc.filename] = [];
    grouped[doc.filename].push({ id: doc.id, content: doc.content });
  }
  const files = Object.entries(grouped).map(([filename, chunks]) => ({ filename, chunks }));
  res.json({ files, totalChunks: documents.length });
});

app.post('/reload', (req, res) => {
  assetDB = loadAssetDB();
  vendorDB = loadVendorDB();
  loadDocuments();
  res.json({
    success: true,
    trailers: assetDB.trailers.length,
    documents: documents.length,
    vendors: vendorDB.vendors.length,
    message: 'All data reloaded'
  });
});

// ============================================
// SERVER STARTUP
// ============================================

loadDocuments();

app.listen(port, () => {
  console.log('\n🚀 RTL Voice Business Assistant - Backend');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  🚛 POST /lookup-asset    - Reefer trailer asset lookup');
  console.log('  📚 POST /search-policies - Policy search');
  console.log('  🏢 POST /search-vendors  - Vendor history search');
  console.log('  💚 GET  /health          - Health check');
  console.log('  🔄 POST /reload          - Reload data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 Data Loaded:');
  console.log(`  Trailers: ${assetDB.trailers.length}`);
  console.log(`  Vendors: ${vendorDB.vendors.length}`);
  console.log(`  Document chunks: ${documents.length}`);
  console.log('');
  console.log('🎉 Ready for Vapi integration!\n');
});

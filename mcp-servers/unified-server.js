require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============================================
// EMPLOYEE CONTEXT FUNCTIONALITY
// ============================================

const EMPLOYEE_DB_PATH = path.join(__dirname, 'employee-context/employee-database.json');

function loadEmployeeDB() {
  if (fs.existsSync(EMPLOYEE_DB_PATH)) {
    return JSON.parse(fs.readFileSync(EMPLOYEE_DB_PATH, 'utf8'));
  }
  return { employees: [] };
}

let employeeDB = loadEmployeeDB();

function findEmployeeByName(name) {
  const nameLower = name.toLowerCase().trim();

  let employee = employeeDB.employees.find(emp =>
    emp.name.toLowerCase() === nameLower ||
    emp.firstName.toLowerCase() === nameLower ||
    `${emp.firstName.toLowerCase()} ${emp.lastName.toLowerCase()}` === nameLower
  );

  if (!employee) {
    employee = employeeDB.employees.find(emp =>
      emp.firstName.toLowerCase().includes(nameLower) ||
      emp.lastName.toLowerCase().includes(nameLower) ||
      emp.name.toLowerCase().includes(nameLower)
    );
  }

  return employee;
}

// Employee lookup endpoint
app.post('/lookup-employee', (req, res) => {
  // Log the full request for debugging
  console.log('\n📥 Full request body:', JSON.stringify(req.body, null, 2));

  // Extract toolCallId for Vapi response format
  const toolCallId = req.body.message?.toolCallList?.[0]?.id;

  // Vapi might send parameters in different formats
  let name = req.body.name
    || req.body.parameters?.name
    || req.body.message?.toolCalls?.[0]?.function?.arguments?.name
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.name;

  console.log(`\n👤 Employee lookup: "${name}"`);
  console.log(`   Tool Call ID: ${toolCallId}`);

  if (!name) {
    console.log('❌ No name found in request body');
    console.log('Available keys:', Object.keys(req.body));
    return res.status(400).json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: 'Error: Name parameter is required'
      }]
    });
  }

  const employee = findEmployeeByName(name);

  if (!employee) {
    console.log('   ❌ Not found');
    const resultText = `I don't have information for "${name}" in our employee directory.`;
    return res.json({
      results: [{
        toolCallId: toolCallId || 'unknown',
        result: resultText
      }]
    });
  }

  console.log(`   ✅ Found: ${employee.name} (${employee.team})`);

  // Format result as single-line text for Vapi
  const resultText = `Employee found: ${employee.firstName} ${employee.lastName}, ${employee.title} in ${employee.department}. Team: ${employee.team}. ${employee.notes} Communication style: ${employee.preferences.communicationStyle}.`;

  res.json({
    results: [{
      toolCallId: toolCallId || 'unknown',
      result: resultText
    }]
  });
});

// ============================================
// PROCUREMENT RAG FUNCTIONALITY
// ============================================

const PROCUREMENT_DOCS_PATH = path.join(__dirname, 'procurement-rag/procurement-docs');
let documents = [];

function loadDocuments() {
  try {
    if (!fs.existsSync(PROCUREMENT_DOCS_PATH)) {
      console.log(`⚠️  Procurement docs directory not found: ${PROCUREMENT_DOCS_PATH}`);
      return;
    }

    const files = fs.readdirSync(PROCUREMENT_DOCS_PATH);
    documents = [];

    files.forEach(file => {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(PROCUREMENT_DOCS_PATH, file), 'utf8');

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
// REQUEST VALIDATION FUNCTIONALITY
// ============================================

function validateProcurementRequest(fields) {
  const missing = [];
  const warnings = [];

  // Required fields
  if (!fields.budget_number) missing.push("budget number");
  if (!fields.milestones) missing.push("milestones");
  if (!fields.costs) missing.push("cost breakdown");
  if (!fields.description) missing.push("project description");
  if (!fields.deadline) warnings.push("deadline or timeline");

  return { missing, warnings };
}

// Request validation endpoint
app.post('/validate-request', (req, res) => {
  console.log('\n📥 Request validation:', JSON.stringify(req.body, null, 2));

  const toolCallId = req.body.message?.toolCallList?.[0]?.id;
  const fields = req.body.message?.toolCallList?.[0]?.function?.arguments || {};

  console.log(`\n✓ Validating request fields...`);

  const validation = validateProcurementRequest(fields);

  let resultText = '';

  if (validation.missing.length > 0) {
    resultText = `Missing required fields: ${validation.missing.join(', ')}. Please provide these before I can submit your request.`;
    console.log(`   ❌ Incomplete: ${validation.missing.join(', ')}`);
  } else {
    resultText = 'All required fields are present! Your request is ready to submit.';
    console.log(`   ✅ Request is complete`);

    if (validation.warnings.length > 0) {
      resultText += ` Note: Consider adding: ${validation.warnings.join(', ')}.`;
    }
  }

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
    employees: employeeDB.employees.length,
    documents: documents.length,
    vendors: vendorDB.vendors.length,
    message: 'Procurement MCP server is running'
  });
});

// ============================================
// DATA BROWSER ENDPOINTS (read-only views of what the AI sees)
// ============================================

app.get('/data/employees', (req, res) => {
  res.json({ employees: employeeDB.employees });
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
  employeeDB = loadEmployeeDB();
  vendorDB = loadVendorDB();
  loadDocuments();
  res.json({
    success: true,
    employees: employeeDB.employees.length,
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
  console.log('\n🚀 IOG Procurement Services - Unified MCP Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  👤 POST /lookup-employee   - Employee context lookup');
  console.log('  📚 POST /search-policies   - Procurement policy search');
  console.log('  🏢 POST /search-vendors    - Vendor history search');
  console.log('  ✅ POST /validate-request  - Request completeness validation');
  console.log('  💚 GET  /health            - Health check');
  console.log('  🔄 POST /reload            - Reload data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 Data Loaded:');
  console.log(`  Employees: ${employeeDB.employees.length}`);
  console.log(`  Vendors: ${vendorDB.vendors.length}`);
  console.log(`  Document chunks: ${documents.length}`);
  console.log('');
  console.log('🎉 Ready for Vapi integration!\n');
});

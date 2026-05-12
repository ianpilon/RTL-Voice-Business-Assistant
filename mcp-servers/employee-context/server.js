require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.EMPLOYEE_CONTEXT_PORT || 3002;

app.use(express.json());

// Employee database file
const EMPLOYEE_DB_PATH = './employee-database.json';

// Initialize employee database
function initializeDatabase() {
  if (!fs.existsSync(EMPLOYEE_DB_PATH)) {
    const sampleData = {
      employees: [
        {
          id: "emp001",
          name: "Billy Johnson",
          firstName: "Billy",
          lastName: "Johnson",
          email: "billy.johnson@iog.com",
          team: "Marketing",
          department: "Marketing & Communications",
          title: "Senior Marketing Manager",
          location: "New York Office",
          manager: "Sarah Chen",
          directReports: [],
          projects: [
            "Q4 Campaign Launch",
            "Brand Refresh Initiative"
          ],
          specialties: [
            "Digital Marketing",
            "Content Strategy",
            "Social Media"
          ],
          legalHistory: [
            {
              date: "2024-10-15",
              type: "Contract Review",
              description: "Vendor agreement for marketing automation platform"
            }
          ],
          preferences: {
            communicationStyle: "Direct and concise",
            timezone: "EST",
            urgentContactMethod: "Slack then phone"
          },
          notes: "Prefers detailed written follow-ups. Usually needs quick turnaround on vendor contracts."
        },
        {
          id: "emp002",
          name: "Bob Martinez",
          firstName: "Bob",
          lastName: "Martinez",
          email: "bob.martinez@iog.com",
          team: "Design",
          department: "Product Design",
          title: "Lead Product Designer",
          location: "San Francisco Office",
          manager: "Jennifer Lee",
          directReports: [
            "Alice Wang",
            "Mike Thompson"
          ],
          projects: [
            "Mobile App Redesign",
            "Design System 2.0"
          ],
          specialties: [
            "UX Design",
            "Product Strategy",
            "User Research"
          ],
          legalHistory: [
            {
              date: "2024-09-20",
              type: "IP Assignment",
              description: "Design work intellectual property agreement"
            },
            {
              date: "2024-11-01",
              type: "NDA Review",
              description: "Client NDA for design consultation project"
            }
          ],
          preferences: {
            communicationStyle: "Visual examples helpful",
            timezone: "PST",
            urgentContactMethod: "Text message"
          },
          notes: "Often works with external clients and needs NDAs reviewed quickly. Manages a team, so may need employment-related legal guidance."
        },
        {
          id: "emp003",
          name: "Sarah Chen",
          firstName: "Sarah",
          lastName: "Chen",
          email: "sarah.chen@iog.com",
          team: "Marketing",
          department: "Marketing & Communications",
          title: "VP of Marketing",
          location: "New York Office",
          manager: "James Wilson (CMO)",
          directReports: [
            "Billy Johnson",
            "Rachel Adams",
            "Tom Harrison"
          ],
          projects: [
            "Annual Marketing Strategy",
            "Budget Planning FY2026",
            "Agency Partnerships"
          ],
          specialties: [
            "Marketing Strategy",
            "Team Leadership",
            "Budget Management"
          ],
          legalHistory: [
            {
              date: "2024-11-05",
              type: "Contract Negotiation",
              description: "Major agency partnership agreement - $500K+"
            }
          ],
          preferences: {
            communicationStyle: "Executive summary first, details available if needed",
            timezone: "EST",
            urgentContactMethod: "Email then call"
          },
          notes: "High-level executive. Needs quick answers. Usually deals with high-value contracts requiring full legal review."
        }
      ]
    };

    fs.writeFileSync(EMPLOYEE_DB_PATH, JSON.stringify(sampleData, null, 2));
    console.log('✅ Created employee database with sample data');
  }

  return JSON.parse(fs.readFileSync(EMPLOYEE_DB_PATH, 'utf8'));
}

let employeeDB = initializeDatabase();

// Helper function to search employees by name (fuzzy matching)
function findEmployeeByName(name) {
  const nameLower = name.toLowerCase().trim();

  // Try exact match first
  let employee = employeeDB.employees.find(emp =>
    emp.name.toLowerCase() === nameLower ||
    emp.firstName.toLowerCase() === nameLower ||
    `${emp.firstName.toLowerCase()} ${emp.lastName.toLowerCase()}` === nameLower
  );

  // Try partial match
  if (!employee) {
    employee = employeeDB.employees.find(emp =>
      emp.firstName.toLowerCase().includes(nameLower) ||
      emp.lastName.toLowerCase().includes(nameLower) ||
      emp.name.toLowerCase().includes(nameLower)
    );
  }

  return employee;
}

// API: Look up employee by name
app.post('/lookup-employee', (req, res) => {
  const { name, caller_phone } = req.body;

  console.log(`\n👤 Employee lookup request: "${name}"`);

  if (!name) {
    return res.status(400).json({
      error: 'Name is required',
      found: false
    });
  }

  const employee = findEmployeeByName(name);

  if (!employee) {
    console.log('   ❌ Employee not found');
    return res.json({
      found: false,
      message: `I don't have any information for "${name}" in our employee directory. Could you verify the spelling or provide an email address?`
    });
  }

  console.log(`   ✅ Found: ${employee.name} (${employee.team} team)`);

  // Build context summary for the AI
  const context = {
    found: true,
    employee: {
      name: employee.name,
      firstName: employee.firstName,
      team: employee.team,
      department: employee.department,
      title: employee.title,
      location: employee.location,
      manager: employee.manager,
      hasDirectReports: employee.directReports.length > 0,
      directReportsCount: employee.directReports.length,
      currentProjects: employee.projects,
      specialties: employee.specialties,
      recentLegalInteractions: employee.legalHistory.length,
      communicationStyle: employee.preferences.communicationStyle,
      notes: employee.notes
    },
    aiInstructions: {
      greeting: `Great! I see you're ${employee.name} from the ${employee.team} team.`,
      context: `This person is ${employee.title} in ${employee.department}. ${employee.notes}`,
      relevantHistory: employee.legalHistory.length > 0
        ? `They previously worked with legal on: ${employee.legalHistory.map(h => h.type).join(', ')}`
        : 'This is their first time contacting legal services.',
      suggestedApproach: employee.preferences.communicationStyle
    }
  };

  res.json(context);
});

// API: Get employee by ID
app.get('/employee/:id', (req, res) => {
  const employee = employeeDB.employees.find(emp => emp.id === req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json(employee);
});

// API: Get all employees (for management)
app.get('/employees', (req, res) => {
  res.json({
    count: employeeDB.employees.length,
    employees: employeeDB.employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      team: emp.team,
      title: emp.title,
      email: emp.email
    }))
  });
});

// API: Add new employee
app.post('/employee', (req, res) => {
  const newEmployee = {
    id: `emp${String(employeeDB.employees.length + 1).padStart(3, '0')}`,
    name: req.body.name,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    team: req.body.team,
    department: req.body.department,
    title: req.body.title,
    location: req.body.location || "Unknown",
    manager: req.body.manager || null,
    directReports: req.body.directReports || [],
    projects: req.body.projects || [],
    specialties: req.body.specialties || [],
    legalHistory: req.body.legalHistory || [],
    preferences: req.body.preferences || {
      communicationStyle: "Professional",
      timezone: "EST",
      urgentContactMethod: "Email"
    },
    notes: req.body.notes || ""
  };

  employeeDB.employees.push(newEmployee);
  fs.writeFileSync(EMPLOYEE_DB_PATH, JSON.stringify(employeeDB, null, 2));

  console.log(`\n✅ Added new employee: ${newEmployee.name}`);

  res.json({
    success: true,
    employee: newEmployee
  });
});

// API: Update employee
app.patch('/employee/:id', (req, res) => {
  const index = employeeDB.employees.findIndex(emp => emp.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  // Update fields
  Object.keys(req.body).forEach(key => {
    if (key !== 'id') {
      employeeDB.employees[index][key] = req.body[key];
    }
  });

  fs.writeFileSync(EMPLOYEE_DB_PATH, JSON.stringify(employeeDB, null, 2));

  console.log(`\n✅ Updated employee: ${employeeDB.employees[index].name}`);

  res.json({
    success: true,
    employee: employeeDB.employees[index]
  });
});

// API: Add legal history entry
app.post('/employee/:id/legal-history', (req, res) => {
  const employee = employeeDB.employees.find(emp => emp.id === req.params.id);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const historyEntry = {
    date: new Date().toISOString().split('T')[0],
    type: req.body.type,
    description: req.body.description
  };

  employee.legalHistory.push(historyEntry);
  fs.writeFileSync(EMPLOYEE_DB_PATH, JSON.stringify(employeeDB, null, 2));

  console.log(`\n✅ Added legal history for: ${employee.name}`);

  res.json({
    success: true,
    employee: employee
  });
});

// API: Reload employee database
app.post('/reload', (req, res) => {
  employeeDB = initializeDatabase();
  res.json({
    success: true,
    count: employeeDB.employees.length,
    message: 'Employee database reloaded'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    employees: employeeDB.employees.length,
    message: 'Employee Context Server is running'
  });
});

app.listen(port, () => {
  console.log('\n🚀 IOG Employee Context Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log(`👤 Lookup endpoint: POST /lookup-employee`);
  console.log(`📋 List employees: GET /employees`);
  console.log(`➕ Add employee: POST /employee`);
  console.log(`✏️  Update employee: PATCH /employee/:id`);
  console.log(`💚 Health check: GET /health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n👥 Employee Database:');
  console.log(`   Employees loaded: ${employeeDB.employees.length}`);
  console.log(`   Teams: ${[...new Set(employeeDB.employees.map(e => e.team))].join(', ')}`);
  console.log('\n💡 The AI will now have context about who it\'s talking to!\n');
});

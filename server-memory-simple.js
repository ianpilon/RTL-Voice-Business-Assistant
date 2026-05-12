require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { HumeClient } = require('hume');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Memory file
const MEMORY_FILE = path.join(__dirname, 'conversation-memory.json');

// Initialize Hume client
const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

// Tier 1 Questions
const TIER1_QUESTIONS = [
  {
    id: 'Q1',
    short: 'Critical Vulnerabilities',
    full: 'What are the 3-5 things that, if they went wrong tomorrow, would put this business in serious danger - and how would you fix them?'
  },
  {
    id: 'Q2',
    short: 'Crisis Moments',
    full: 'Walk me through your last three \'oh shit\' moments - what went wrong, what did you do, and what would you do differently now?'
  },
  {
    id: 'Q3',
    short: 'Critical Relationships',
    full: 'Which customers, suppliers, or relationships are absolutely critical to keep - and what\'s the unwritten agreement or history with each that I need to know?'
  },
  {
    id: 'Q4',
    short: 'Silent Killers',
    full: 'What are the \'silent killers\' - small things people ignore that snowball into big problems?'
  }
];

// Initialize memory
if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify({ callers: {}, lastUpdated: null }, null, 2));
}

function readMemory() {
  return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
}

function writeMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

function getOrCreateCaller(phone) {
  const memory = readMemory();
  if (!memory.callers[phone]) {
    memory.callers[phone] = {
      phone,
      call_count: 0,
      questions_answered: [],
      conversation_notes: {},
      call_history: [],
      first_call: new Date().toISOString()
    };
    writeMemory(memory);
  }
  return memory.callers[phone];
}

// Generate dynamic prompt based on caller history
function generateDynamicPrompt(caller) {
  // Read base prompt
  const basePrompt = fs.readFileSync(
    path.join(__dirname, 'system-prompt.txt'),
    'utf8'
  );

  let contextSection = '\n\n--- CONVERSATION CONTEXT ---\n';

  if (caller.call_count === 0) {
    contextSection += 'This is a new caller. Welcome them warmly and begin with the first discovery question.\n';
  } else {
    contextSection += `RETURNING CALLER (Call #${caller.call_count + 1})\n\n`;

    if (caller.questions_answered.length > 0) {
      contextSection += 'QUESTIONS ALREADY COVERED:\n';
      caller.questions_answered.forEach(qId => {
        const q = TIER1_QUESTIONS.find(x => x.id === qId);
        const notes = caller.conversation_notes[qId];
        if (q) {
          contextSection += `✓ ${q.short}: ${notes || 'Discussed'}\n`;
        }
      });
      contextSection += '\n';
    }

    const nextIndex = caller.questions_answered.length;
    if (nextIndex < TIER1_QUESTIONS.length) {
      const nextQ = TIER1_QUESTIONS[nextIndex];
      contextSection += `NEXT QUESTION TO ASK:\n`;
      contextSection += `${nextQ.id} - ${nextQ.short}\n`;
      contextSection += `"${nextQ.full}"\n`;
    } else {
      contextSection += 'ALL QUESTIONS COMPLETE. Thank them for their valuable insights.\n';
    }
  }

  contextSection += '\n--- TIER 1 DISCOVERY QUESTIONS ---\n';
  TIER1_QUESTIONS.forEach(q => {
    contextSection += `\n${q.id}: ${q.short}\n`;
    contextSection += `"${q.full}"\n`;
  });

  return basePrompt + contextSection;
}

// Webhook: Update prompt before call (called by external trigger)
app.post('/prepare-call/:phone', async (req, res) => {
  const phone = req.params.phone;

  try {
    const caller = getOrCreateCaller(phone);
    const dynamicPrompt = generateDynamicPrompt(caller);

    console.log(`\n🔄 Preparing call for: ${phone}`);
    console.log(`   Call count: ${caller.call_count}`);
    console.log(`   Questions answered: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length}`);

    // Update Hume config
    await hume.empathicVoice.configs.updateConfig(
      process.env.HUME_CONFIG_ID,
      {
        prompt: { text: dynamicPrompt }
      }
    );

    console.log(`   ✅ Updated Hume config with conversation context\n`);

    res.json({
      success: true,
      caller,
      next_question: caller.questions_answered.length < TIER1_QUESTIONS.length
        ? TIER1_QUESTIONS[caller.questions_answered.length].short
        : 'All complete'
    });

  } catch (error) {
    console.error('❌ Error preparing call:', error);
    res.status(500).json({ error: error.message });
  }
});

// Twilio call status webhook
app.post('/call-status', (req, res) => {
  const { CallSid, CallStatus, From, Duration } = req.body;

  console.log(`\n📊 Call Status: ${CallStatus}`);
  console.log(`   From: ${From}`);
  console.log(`   Duration: ${Duration}s`);

  if (CallStatus === 'completed' && parseInt(Duration) > 30) {
    const memory = readMemory();
    const caller = memory.callers[From];

    if (caller) {
      caller.call_count += 1;
      caller.call_history.push({
        call_sid: CallSid,
        date: new Date().toISOString(),
        duration: parseInt(Duration)
      });

      // Simple heuristic: mark next question as answered if call was substantial
      if (parseInt(Duration) > 60 && caller.questions_answered.length < TIER1_QUESTIONS.length) {
        const nextQ = TIER1_QUESTIONS[caller.questions_answered.length];
        caller.questions_answered.push(nextQ.id);
        caller.conversation_notes[nextQ.id] = `Discussed in ${Duration}s call`;

        console.log(`   ✅ Marked ${nextQ.short} as answered`);
      }

      writeMemory(memory);
    }
  }

  res.sendStatus(200);
});

// API: Manual question tracking
app.post('/mark-answered', (req, res) => {
  const { phone, questionId, notes } = req.body;

  try {
    const memory = readMemory();
    const caller = memory.callers[phone];

    if (!caller) {
      return res.status(404).json({ error: 'Caller not found' });
    }

    if (!caller.questions_answered.includes(questionId)) {
      caller.questions_answered.push(questionId);
      caller.conversation_notes[questionId] = notes || 'Manually marked';
      writeMemory(memory);
    }

    res.json({ success: true, caller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: View memory
app.get('/memory/:phone?', (req, res) => {
  const memory = readMemory();

  if (req.params.phone) {
    const caller = memory.callers[req.params.phone];
    if (!caller) {
      return res.status(404).json({ error: 'Caller not found' });
    }
    return res.json(caller);
  }

  res.json(memory);
});

// API: Reset caller
app.post('/reset/:phone', (req, res) => {
  const memory = readMemory();

  if (memory.callers[req.params.phone]) {
    delete memory.callers[req.params.phone];
    writeMemory(memory);
    res.json({ success: true, message: 'Caller reset' });
  } else {
    res.status(404).json({ error: 'Caller not found' });
  }
});

// Health check
app.get('/', (req, res) => {
  const memory = readMemory();
  res.json({
    status: 'running',
    message: 'Baton AI Memory System',
    total_callers: Object.keys(memory.callers).length,
    questions: TIER1_QUESTIONS.length
  });
});

app.listen(port, () => {
  console.log('🚀 Baton AI Memory System');
  console.log(`📍 Port: ${port}`);
  console.log(`📊 Call Status: /call-status`);
  console.log(`🔄 Prepare Call: POST /prepare-call/:phone`);
  console.log(`💾 Memory: ${MEMORY_FILE}\n`);
});

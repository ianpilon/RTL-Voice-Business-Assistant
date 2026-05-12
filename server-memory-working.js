require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');
const { HumeClient } = require('hume');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const MEMORY_FILE = path.join(__dirname, 'conversation-memory.json');

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

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

if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify({ callers: {} }, null, 2));
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

async function updateHumePromptForCaller(caller) {
  const basePrompt = fs.readFileSync(
    path.join(__dirname, 'system-prompt.txt'),
    'utf8'
  );

  let context = '\n\n=== CONVERSATION MEMORY ===\n';

  if (caller.call_count === 0) {
    context += 'NEW CALLER: Welcome them warmly. Start with Question 1.\n';
  } else {
    context += `RETURNING CALLER - Call #${caller.call_count + 1}\n\n`;

    if (caller.questions_answered.length > 0) {
      context += 'PREVIOUSLY DISCUSSED:\n';
      caller.questions_answered.forEach(qId => {
        const q = TIER1_QUESTIONS.find(x => x.id === qId);
        const notes = caller.conversation_notes[qId];
        context += `✓ ${q ? q.short : qId}: ${notes || 'Covered'}\n`;
      });
      context += '\n';
    }

    const nextIndex = caller.questions_answered.length;
    if (nextIndex < TIER1_QUESTIONS.length) {
      const nextQ = TIER1_QUESTIONS[nextIndex];
      context += `TODAY'S QUESTION:\n`;
      context += `${nextQ.short}\n`;
      context += `"${nextQ.full}"\n`;
    } else {
      context += 'ALL 4 QUESTIONS COMPLETE!\n';
      context += 'Thank them warmly for sharing their critical knowledge.\n';
    }
  }

  context += '\n=== ALL DISCOVERY QUESTIONS ===\n';
  TIER1_QUESTIONS.forEach((q, i) => {
    const answered = caller.questions_answered.includes(q.id) ? '✓' : ' ';
    context += `\n[${answered}] Q${i + 1}: ${q.short}\n`;
    context += `    "${q.full}"\n`;
  });

  const fullPrompt = basePrompt + context;

  await hume.empathicVoice.configs.updateConfig(
    process.env.HUME_CONFIG_ID,
    {
      prompt: { text: fullPrompt }
    }
  );

  return fullPrompt;
}

// Incoming call: Update prompt, then redirect to Hume
app.post('/voice', async (req, res) => {
  const callerPhone = req.body.From;

  console.log(`\n📞 Incoming call from: ${callerPhone}`);

  try {
    const caller = getOrCreateCaller(callerPhone);

    console.log(`   Status: ${caller.call_count === 0 ? 'NEW' : 'RETURNING'}`);
    console.log(`   Total Calls: ${caller.call_count}`);
    console.log(`   Progress: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length} questions`);

    // Update Hume config with caller's context
    console.log(`   🔄 Updating Hume prompt with conversation context...`);
    await updateHumePromptForCaller(caller);
    console.log(`   ✅ Prompt updated`);

    // Build TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    // Brief pause for ring effect
    twiml.pause({ length: 1 });

    // Say to avoid hangup issue
    twiml.say({
      voice: 'Polly.Matthew'
    }, 'Connecting you now');

    // Redirect to Hume
    const humeUrl = `https://api.hume.ai/v0/evi/twilio?config_id=${process.env.HUME_CONFIG_ID}&api_key=${process.env.HUME_API_KEY}`;

    console.log(`   📡 Redirecting to Hume EVI\n`);

    twiml.redirect(humeUrl);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling incoming call:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was a technical issue. Please try again.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Call status: Track completion
app.post('/call-status', (req, res) => {
  const { CallSid, CallStatus, From, Duration } = req.body;

  console.log(`\n📊 Call Status: ${CallStatus}`);
  console.log(`   From: ${From}`);
  console.log(`   Duration: ${Duration}s`);

  if (CallStatus === 'completed') {
    const duration = parseInt(Duration) || 0;

    if (duration > 30) {
      const memory = readMemory();
      const caller = memory.callers[From];

      if (caller) {
        caller.call_count += 1;
        caller.call_history.push({
          call_sid: CallSid,
          date: new Date().toISOString(),
          duration
        });

        // If substantial call (>60s) and questions remain, mark next one answered
        if (duration > 60 && caller.questions_answered.length < TIER1_QUESTIONS.length) {
          const nextQ = TIER1_QUESTIONS[caller.questions_answered.length];
          caller.questions_answered.push(nextQ.id);
          caller.conversation_notes[nextQ.id] = `Discussed in ${duration}s call on ${new Date().toISOString()}`;

          console.log(`   ✅ Marked "${nextQ.short}" as answered`);
          console.log(`   📊 Progress: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length}`);
        }

        writeMemory(memory);
      }
    }
  }

  res.sendStatus(200);
});

// API: View memory
app.get('/memory/:phone?', (req, res) => {
  const memory = readMemory();

  if (req.params.phone) {
    const caller = memory.callers[req.params.phone];
    return caller
      ? res.json(caller)
      : res.status(404).json({ error: 'Not found' });
  }

  res.json(memory);
});

// API: Manual question update
app.post('/mark-answered', (req, res) => {
  const { phone, questionId, notes } = req.body;

  if (!phone || !questionId) {
    return res.status(400).json({ error: 'phone and questionId required' });
  }

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
});

// API: Reset
app.post('/reset/:phone', (req, res) => {
  const memory = readMemory();
  if (memory.callers[req.params.phone]) {
    delete memory.callers[req.params.phone];
    writeMemory(memory);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.get('/', (req, res) => {
  const memory = readMemory();
  res.json({
    status: 'running',
    message: 'Baton AI Discovery with Conversation Memory',
    callers: Object.keys(memory.callers).length,
    questions: TIER1_QUESTIONS.length
  });
});

app.listen(port, () => {
  console.log('🚀 Baton AI Discovery Server with Memory');
  console.log(`📍 Port: ${port}`);
  console.log(`📞 Voice Webhook: /voice`);
  console.log(`📊 Status Webhook: /call-status`);
  console.log(`💾 Memory: ${MEMORY_FILE}`);
  console.log(`❓ Questions: ${TIER1_QUESTIONS.length}\n`);
});

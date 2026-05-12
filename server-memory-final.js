require('dotenv').config();
const express = require('express');
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
  fs.writeFileSync(MEMORY_FILE, JSON.stringify({ callers: {}, lastUpdate: null }, null, 2));
}

function readMemory() {
  return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
}

function writeMemory(data) {
  data.lastUpdate = new Date().toISOString();
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
      first_call: new Date().toISOString(),
      last_call: null
    };
    writeMemory(memory);
  }
  return memory.callers[phone];
}

async function updateHumePromptForCaller(phone) {
  const caller = getOrCreateCaller(phone);
  const basePrompt = fs.readFileSync(
    path.join(__dirname, 'system-prompt.txt'),
    'utf8'
  );

  let context = '\n\n=== CONVERSATION MEMORY ===\n';

  if (caller.call_count === 0) {
    context += 'NEW CALLER\n';
    context += 'Welcome them warmly and begin with the first discovery question.\n';
  } else {
    context += `RETURNING CALLER - This is call #${caller.call_count + 1}\n\n`;

    if (caller.questions_answered.length > 0) {
      context += 'QUESTIONS ALREADY COVERED:\n';
      caller.questions_answered.forEach(qId => {
        const q = TIER1_QUESTIONS.find(x => x.id === qId);
        const notes = caller.conversation_notes[qId];
        context += `✓ ${q ? q.short : qId}: ${notes || 'Discussed'}\n`;
      });
      context += '\n';
    }

    const nextIndex = caller.questions_answered.length;
    if (nextIndex < TIER1_QUESTIONS.length) {
      const nextQ = TIER1_QUESTIONS[nextIndex];
      context += `NEXT QUESTION TO ASK TODAY:\n`;
      context += `${nextQ.id} - ${nextQ.short}\n`;
      context += `"${nextQ.full}"\n\n`;
      context += 'Focus on this question but let the conversation flow naturally.\n';
    } else {
      context += 'ALL 4 DISCOVERY QUESTIONS COMPLETE!\n';
      context += 'Thank them sincerely for sharing their critical business knowledge.\n';
      context += 'This conversation series has been very valuable.\n';
    }
  }

  context += '\n=== TIER 1: BUSINESS SURVIVAL DISCOVERY QUESTIONS ===\n';
  TIER1_QUESTIONS.forEach((q, i) => {
    const status = caller.questions_answered.includes(q.id) ? '✓ DONE' : 'PENDING';
    context += `\n[${status}] Question ${i + 1}: ${q.short}\n`;
    context += `"${q.full}"\n`;
  });

  const fullPrompt = basePrompt + context;

  await hume.empathicVoice.configs.updateConfig(
    process.env.HUME_CONFIG_ID,
    {
      prompt: { text: fullPrompt }
    }
  );

  console.log(`✅ Updated Hume config for ${phone}`);
  console.log(`   Progress: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length} questions`);

  return { caller, prompt: fullPrompt };
}

// Twilio call status webhook - the MAIN integration point
app.post('/call-status', async (req, res) => {
  const { CallSid, CallStatus, From, Duration } = req.body;

  console.log(`\n📊 Call Status: ${CallStatus}`);
  console.log(`   From: ${From}`);
  console.log(`   CallSid: ${CallSid}`);
  console.log(`   Duration: ${Duration}s`);

  // Handle call completion
  if (CallStatus === 'completed') {
    const duration = parseInt(Duration) || 0;

    if (duration > 30) {
      try {
        const memory = readMemory();
        const caller = memory.callers[From] || getOrCreateCaller(From);

        // Update call history
        caller.call_count += 1;
        caller.last_call = new Date().toISOString();
        caller.call_history.push({
          call_sid: CallSid,
          date: new Date().toISOString(),
          duration
        });

        // Mark question as answered if call was substantial (>60s) and questions remain
        if (duration > 60 && caller.questions_answered.length < TIER1_QUESTIONS.length) {
          const nextQ = TIER1_QUESTIONS[caller.questions_answered.length];
          caller.questions_answered.push(nextQ.id);
          caller.conversation_notes[nextQ.id] = `Discussed in ${duration}s call`;

          console.log(`   ✅ Marked "${nextQ.short}" as covered`);
        }

        memory.callers[From] = caller;
        writeMemory(memory);

        // IMPORTANT: Update Hume prompt for NEXT call
        console.log(`\n🔄 Preparing for next call...`);
        await updateHumePromptForCaller(From);

        console.log(`\n✨ Memory updated successfully!\n`);

      } catch (error) {
        console.error('❌ Error updating memory:', error);
      }
    }
  }

  res.sendStatus(200);
});

// API: Get caller memory
app.get('/memory/:phone?', (req, res) => {
  const memory = readMemory();

  if (req.params.phone) {
    const caller = memory.callers[req.params.phone];
    return caller
      ? res.json(caller)
      : res.status(404).json({ error: 'Caller not found' });
  }

  res.json(memory);
});

// API: Manually update question status
app.post('/mark-answered', async (req, res) => {
  const { phone, questionId, notes } = req.body;

  if (!phone || !questionId) {
    return res.status(400).json({ error: 'phone and questionId required' });
  }

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

      // Update Hume config
      await updateHumePromptForCaller(phone);
    }

    res.json({ success: true, caller });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Reset caller
app.post('/reset/:phone', async (req, res) => {
  try {
    const memory = readMemory();
    const phone = req.params.phone;

    if (memory.callers[phone]) {
      delete memory.callers[phone];
      writeMemory(memory);

      // Reset Hume config to fresh state
      await updateHumePromptForCaller(phone);

      res.json({ success: true, message: 'Caller reset' });
    } else {
      res.status(404).json({ error: 'Caller not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Manually refresh Hume config for a caller
app.post('/refresh-prompt/:phone', async (req, res) => {
  try {
    const result = await updateHumePromptForCaller(req.params.phone);
    res.json({
      success: true,
      caller: result.caller,
      prompt_length: result.prompt.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  const memory = readMemory();
  res.json({
    status: 'running',
    message: 'Baton AI Discovery System with Conversation Memory',
    total_callers: Object.keys(memory.callers).length,
    questions: TIER1_QUESTIONS.length,
    last_update: memory.lastUpdate
  });
});

app.listen(port, () => {
  console.log('\n🚀 Baton AI Discovery Server with Memory');
  console.log(`📍 Port: ${port}`);
  console.log(`\n📌 TWILIO CONFIGURATION:`);
  console.log(`   Voice URL (A call comes in):`);
  console.log(`   https://api.hume.ai/v0/evi/twilio?config_id=${process.env.HUME_CONFIG_ID}&api_key=${process.env.HUME_API_KEY}`);
  console.log(`\n   Status Callback URL:`);
  console.log(`   [Your ngrok URL]/call-status`);
  console.log(`\n💾 Memory File: ${MEMORY_FILE}`);
  console.log(`❓ Discovery Questions: ${TIER1_QUESTIONS.length}`);
  console.log(`\n✨ Ready to track conversations!\n`);
});

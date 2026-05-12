require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');
const { Hume, HumeClient } = require('hume');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Memory file for tracking conversation progress
const MEMORY_FILE = path.join(__dirname, 'conversation-memory.json');

// Initialize Hume client
const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

// Tier 1 questions (from Critical Knowledge Capture Questions.md)
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

// Initialize memory file
if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify({ callers: {} }, null, 2));
}

// Helper: Read memory
function readMemory() {
  const data = fs.readFileSync(MEMORY_FILE, 'utf8');
  return JSON.parse(data);
}

// Helper: Write memory
function writeMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

// Helper: Get or create caller
function getOrCreateCaller(phoneNumber) {
  const memory = readMemory();

  if (!memory.callers[phoneNumber]) {
    memory.callers[phoneNumber] = {
      phone: phoneNumber,
      call_count: 0,
      first_call_date: new Date().toISOString(),
      last_call_date: null,
      questions_answered: [], // Array of question IDs answered
      conversation_notes: {}, // Key insights from each question
      call_history: []
    };
    writeMemory(memory);
  }

  return memory.callers[phoneNumber];
}

// Helper: Generate context for Hume based on previous conversations
function generateConversationContext(caller) {
  if (caller.call_count === 0) {
    return `This is a new caller. Start with a warm introduction and begin with Question 1 (Critical Vulnerabilities).`;
  }

  const answeredQuestions = caller.questions_answered || [];
  const nextQuestionIndex = answeredQuestions.length;

  if (nextQuestionIndex >= TIER1_QUESTIONS.length) {
    return `This caller has completed all Tier 1 questions. Thank them for their time and insights. Optionally review key learnings or discuss next steps.`;
  }

  // Build context string
  let context = `RETURNING CALLER - Call #${caller.call_count + 1}\n\n`;
  context += `PREVIOUS PROGRESS:\n`;

  answeredQuestions.forEach(qId => {
    const question = TIER1_QUESTIONS.find(q => q.id === qId);
    const notes = caller.conversation_notes[qId];
    if (question && notes) {
      context += `✓ ${question.short}: ${notes}\n`;
    }
  });

  const nextQuestion = TIER1_QUESTIONS[nextQuestionIndex];
  context += `\nNEXT QUESTION TO ASK:\n`;
  context += `${nextQuestion.id} - ${nextQuestion.short}\n`;
  context += `"${nextQuestion.full}"\n`;

  return context;
}

// Helper: Update Hume config with conversation context
async function updateHumeConfigWithContext(caller) {
  try {
    const context = generateConversationContext(caller);

    // Read the base system prompt
    const basePrompt = fs.readFileSync(
      path.join(__dirname, 'system-prompt.txt'),
      'utf8'
    );

    // Combine base prompt with conversation context
    const fullPrompt = `${basePrompt}\n\n--- CONVERSATION CONTEXT ---\n${context}`;

    console.log(`\n📝 Generated context for caller:\n${context}\n`);

    // Update the Hume config
    await hume.empathicVoice.configs.updateConfig(
      process.env.HUME_CONFIG_ID,
      {
        prompt: { text: fullPrompt }
      }
    );

    console.log(`✅ Updated Hume config with conversation context`);

    return true;
  } catch (error) {
    console.error('❌ Error updating Hume config:', error);
    return false;
  }
}

// Incoming call handler - Direct to Hume after updating context
app.post('/voice', async (req, res) => {
  const callerPhone = req.body.From;

  console.log(`\n📞 Incoming call from: ${callerPhone}`);

  try {
    // Get caller info
    const caller = getOrCreateCaller(callerPhone);

    console.log(`   Caller: ${caller.call_count === 0 ? 'NEW' : 'RETURNING'}`);
    console.log(`   Total Calls: ${caller.call_count}`);
    console.log(`   Questions Answered: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length}`);
    console.log(`   Last Call: ${caller.last_call_date || 'Never'}`);

    // Update Hume config with conversation context
    await updateHumeConfigWithContext(caller);

    // Generate TwiML to redirect directly to Hume
    const twiml = new twilio.twiml.VoiceResponse();

    // Add brief pause (ring effect)
    twiml.pause({ length: 2 });

    // Direct to Hume EVI
    const humeUrl = `https://api.hume.ai/v0/evi/twilio?config_id=${process.env.HUME_CONFIG_ID}&api_key=${process.env.HUME_API_KEY}`;
    twiml.redirect(humeUrl);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling call:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was a technical issue. Please try again later.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Call status handler - Update memory after call completes
app.post('/call-status', async (req, res) => {
  const { CallSid, CallStatus, From, Duration } = req.body;

  console.log(`\n📊 Call Status Update:`);
  console.log(`   CallSid: ${CallSid}`);
  console.log(`   Status: ${CallStatus}`);
  console.log(`   From: ${From}`);
  console.log(`   Duration: ${Duration}s`);

  if (CallStatus === 'completed' && parseInt(Duration) > 10) {
    try {
      const memory = readMemory();
      const caller = memory.callers[From];

      if (caller) {
        // Update call count and history
        caller.call_count += 1;
        caller.last_call_date = new Date().toISOString();
        caller.call_history.push({
          date: new Date().toISOString(),
          duration: Duration,
          call_sid: CallSid
        });

        // TODO: In production, analyze transcript to determine which questions were answered
        // For now, we'll mark the next question as answered if call was > 60 seconds
        if (parseInt(Duration) > 60 && caller.questions_answered.length < TIER1_QUESTIONS.length) {
          const nextQuestion = TIER1_QUESTIONS[caller.questions_answered.length];
          caller.questions_answered.push(nextQuestion.id);
          caller.conversation_notes[nextQuestion.id] = `Discussed during ${Duration}s call on ${new Date().toISOString()}`;

          console.log(`   ✅ Marked ${nextQuestion.id} (${nextQuestion.short}) as answered`);
        }

        writeMemory(memory);
        console.log(`   ✅ Updated caller memory`);
      }

    } catch (error) {
      console.error('❌ Error updating caller memory:', error);
    }
  }

  res.sendStatus(200);
});

// API endpoint: View caller memory
app.get('/memory/:phone', (req, res) => {
  const phoneNumber = req.params.phone;
  const memory = readMemory();
  const caller = memory.callers[phoneNumber];

  if (!caller) {
    return res.status(404).json({ error: 'Caller not found' });
  }

  res.json(caller);
});

// API endpoint: View all callers
app.get('/memory', (req, res) => {
  const memory = readMemory();
  res.json(memory);
});

// API endpoint: Manually mark question as answered (for testing)
app.post('/mark-answered', (req, res) => {
  const { phone, questionId, notes } = req.body;

  if (!phone || !questionId) {
    return res.status(400).json({ error: 'Phone and questionId required' });
  }

  try {
    const memory = readMemory();
    const caller = memory.callers[phone];

    if (!caller) {
      return res.status(404).json({ error: 'Caller not found' });
    }

    if (!caller.questions_answered.includes(questionId)) {
      caller.questions_answered.push(questionId);
      caller.conversation_notes[questionId] = notes || 'Manually marked as answered';
      writeMemory(memory);
    }

    res.json({
      message: 'Question marked as answered',
      caller: caller
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint: Reset caller (for testing)
app.post('/reset/:phone', (req, res) => {
  const phoneNumber = req.params.phone;
  const memory = readMemory();

  if (memory.callers[phoneNumber]) {
    delete memory.callers[phoneNumber];
    writeMemory(memory);
    res.json({ message: 'Caller reset successfully' });
  } else {
    res.status(404).json({ error: 'Caller not found' });
  }
});

// Health check
app.get('/', (req, res) => {
  const memory = readMemory();
  const totalCallers = Object.keys(memory.callers).length;

  res.json({
    status: 'running',
    message: 'Baton AI Discovery System with Conversation Memory',
    total_callers: totalCallers,
    tier1_questions: TIER1_QUESTIONS.length
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Baton AI Discovery Server with Conversation Memory Started');
  console.log(`📍 Port: ${port}`);
  console.log(`📞 Webhook URL: http://localhost:${port}/voice`);
  console.log(`📊 Status URL: http://localhost:${port}/call-status`);
  console.log(`💾 Memory File: ${MEMORY_FILE}`);
  console.log(`📝 Tier 1 Questions: ${TIER1_QUESTIONS.length}`);
  console.log('');
  console.log('🎯 Ready to receive calls!\n');
});

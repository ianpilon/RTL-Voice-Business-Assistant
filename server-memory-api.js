require('dotenv').config();
const express = require('express');
const { HumeClient } = require('hume');
const fs = require('fs');
const path = require('path');

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

// Initialize memory
if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify({ callers: {}, chat_groups: {} }, null, 2));
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
      chat_group_id: null,
      first_call: new Date().toISOString()
    };
    writeMemory(memory);
  }
  return memory.callers[phone];
}

// Twilio status callback - called when call ends
app.post('/status', async (req, res) => {
  const { CallSid, CallStatus, From } = req.body;

  console.log(`\n📞 Call status: ${CallStatus}`);
  console.log(`   CallSid: ${CallSid}`);
  console.log(`   From: ${From}`);

  if (CallStatus === 'completed') {
    console.log(`\n🔍 Fetching transcript for completed call...`);

    // Wait a few seconds for Hume to process the call
    setTimeout(async () => {
      try {
        await fetchAndSaveTranscript(From, CallSid);
      } catch (error) {
        console.error('❌ Error fetching transcript:', error.message);
      }
    }, 5000);
  }

  res.sendStatus(200);
});

async function fetchAndSaveTranscript(callerPhone, callSid) {
  const memory = readMemory();
  const caller = memory.callers[callerPhone];

  if (!caller) {
    console.log('⚠️  No caller record found');
    return;
  }

  // List recent chat groups to find this call
  const chatGroups = await hume.empathicVoice.chatGroups.listChatGroups({
    pageSize: 20
  });

  console.log(`📋 Found ${chatGroups.data.length} recent chat groups`);

  // Find the most recent chat group for this caller
  // Hume creates a chat group for each call
  const recentGroup = chatGroups.data[0]; // Most recent

  if (!recentGroup) {
    console.log('⚠️  No chat groups found');
    return;
  }

  console.log(`\n💬 Fetching chat group: ${recentGroup.id}`);

  // Get the full chat history
  const events = await hume.empathicVoice.chatGroups.listChatGroupEvents(
    recentGroup.id,
    { pageSize: 100 }
  );

  console.log(`   Events found: ${events.data.length}`);

  // Extract transcript from events
  const transcript = [];
  for (const event of events.data) {
    if (event.type === 'USER_MESSAGE' || event.type === 'AGENT_MESSAGE') {
      transcript.push({
        role: event.type === 'USER_MESSAGE' ? 'user' : 'assistant',
        text: event.messageText || '',
        timestamp: event.timestamp
      });
    }
  }

  console.log(`   Transcript length: ${transcript.length} messages`);

  if (transcript.length > 0) {
    // Save to memory
    caller.call_count += 1;
    caller.chat_group_id = recentGroup.id;
    caller.call_history.push({
      call_sid: callSid,
      chat_group_id: recentGroup.id,
      date: new Date().toISOString(),
      message_count: transcript.length
    });

    // Analyze transcript for answered questions
    const transcriptText = transcript
      .filter(m => m.role === 'user')
      .map(m => m.text)
      .join(' ').toLowerCase();

    TIER1_QUESTIONS.forEach(q => {
      if (!caller.questions_answered.includes(q.id)) {
        const keywords = {
          'Q1': ['danger', 'wrong', 'serious', 'risk', 'fail'],
          'Q2': ['oh shit', 'crisis', 'went wrong', 'problem'],
          'Q3': ['customer', 'supplier', 'relationship', 'critical'],
          'Q4': ['silent', 'ignore', 'small', 'snowball']
        };

        const qKeywords = keywords[q.id] || [];
        const mentioned = qKeywords.some(kw => transcriptText.includes(kw));

        if (mentioned) {
          caller.questions_answered.push(q.id);
          const userResponses = transcript
            .filter(m => m.role === 'user')
            .map(m => m.text)
            .join(' ');
          caller.conversation_notes[q.id] = userResponses.substring(0, 200) + '...';
          console.log(`   ✅ Marked ${q.short} as answered`);
        }
      }
    });

    writeMemory(memory);
    console.log(`\n💾 Saved conversation memory`);
    console.log(`   Progress: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length} questions\n`);
  }
}

// API: View memory
app.get('/memory/:phone?', (req, res) => {
  const memory = readMemory();
  if (req.params.phone) {
    const caller = memory.callers[req.params.phone];
    return caller ? res.json(caller) : res.status(404).json({ error: 'Not found' });
  }
  res.json(memory);
});

// API: Manually fetch transcript for a phone number
app.post('/fetch/:phone', async (req, res) => {
  try {
    await fetchAndSaveTranscript(req.params.phone, 'manual');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log('\n🚀 Baton AI Memory Server (API-based)');
  console.log(`📍 Port: ${port}`);
  console.log(`📞 Status webhook: POST /status`);
  console.log(`💾 Memory: ${MEMORY_FILE}`);
  console.log(`🔍 View memory: GET /memory/:phone`);
  console.log(`📥 Fetch transcript: POST /fetch/:phone\n`);
  console.log('✨ Ready to track conversations!\n');
});

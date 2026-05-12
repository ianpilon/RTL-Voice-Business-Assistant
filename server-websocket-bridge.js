require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const WebSocket = require('ws');
const { HumeClient } = require('hume');
const fs = require('fs');
const path = require('path');
const { mulaw } = require('alawmulaw');

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
      transcripts: [],
      first_call: new Date().toISOString()
    };
    writeMemory(memory);
  }
  return memory.callers[phone];
}

function generateConversationContext(caller) {
  if (caller.call_count === 0) {
    return `This is a NEW caller. Welcome them and start with Question 1.`;
  }

  let context = `RETURNING CALLER - Call #${caller.call_count + 1}\n\n`;

  if (caller.questions_answered.length > 0) {
    context += `PREVIOUS CONVERSATIONS:\n`;
    caller.questions_answered.forEach(qId => {
      const q = TIER1_QUESTIONS.find(x => x.id === qId);
      const notes = caller.conversation_notes[qId];
      if (q && notes) {
        context += `✓ ${q.short}: ${notes}\n`;
      }
    });
    context += `\n`;
  }

  const nextIndex = caller.questions_answered.length;
  if (nextIndex < TIER1_QUESTIONS.length) {
    const nextQ = TIER1_QUESTIONS[nextIndex];
    context += `TODAY'S FOCUS:\n`;
    context += `${nextQ.short}\n`;
    context += `"${nextQ.full}"\n`;
  } else {
    context += `ALL 4 QUESTIONS COMPLETE! Thank them for their insights.\n`;
  }

  return context;
}

// Incoming call webhook
app.post('/voice', async (req, res) => {
  const callerPhone = req.body.From;
  const callSid = req.body.CallSid;

  console.log(`\n📞 Incoming call from: ${callerPhone}`);
  console.log(`   CallSid: ${callSid}`);

  const caller = getOrCreateCaller(callerPhone);
  console.log(`   Status: ${caller.call_count === 0 ? 'NEW' : 'RETURNING'}`);
  console.log(`   Progress: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length} questions`);

  // Generate TwiML with WebSocket stream
  const twiml = new twilio.twiml.VoiceResponse();

  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.headers.host}/media`,
    parameters: {
      callerPhone,
      callSid
    }
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// WebSocket server for Twilio media streams
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', async (twilioWs, request, callerPhone, callSid) => {
  console.log(`\n🔌 WebSocket connected for ${callerPhone}`);

  const caller = getOrCreateCaller(callerPhone);
  const context = generateConversationContext(caller);

  // Read base prompt
  const basePrompt = fs.readFileSync(
    path.join(__dirname, 'enhanced-prompt.txt'),
    'utf8'
  );

  const fullPrompt = `${basePrompt}\n\n=== CONVERSATION CONTEXT ===\n${context}`;

  console.log(`📝 Conversation context prepared`);

  let transcript = [];
  let streamSid = null;
  let humeWs = null;

  // Connect to Hume EVI WebSocket
  try {
    const humeWsUrl = `wss://api.hume.ai/v0/evi/chat?api_key=${encodeURIComponent(process.env.HUME_API_KEY)}&config_id=${encodeURIComponent(process.env.HUME_CONFIG_ID)}`;

    humeWs = new WebSocket(humeWsUrl);

    humeWs.on('open', () => {
      console.log(`✅ Connected to Hume EVI`);

      // Send session settings with context only (let Hume use default audio settings)
      humeWs.send(JSON.stringify({
        type: 'session_settings',
        context: {
          text: fullPrompt
        }
      }));
    });

    humeWs.on('message', (data) => {
      try {
        const message = JSON.parse(data);

        // Log all message types for debugging
        console.log(`🔍 Hume message type: ${message.type}`);

        // Capture transcript
        if (message.type === 'user_message' || message.type === 'assistant_message') {
          transcript.push({
            role: message.type === 'user_message' ? 'user' : 'assistant',
            text: message.message?.content || message.text,
            timestamp: new Date().toISOString()
          });

          console.log(`💬 ${message.type === 'user_message' ? 'User' : 'AI'}: ${message.message?.content || message.text}`);
        }

        // Forward audio to Twilio (convert 16kHz PCM to 8kHz mulaw)
        if (message.type === 'audio_output' && message.data) {
          console.log(`🔊 Received audio from Hume, length: ${message.data.length}`);
          const pcm16khz = Buffer.from(message.data, 'base64');

          // Downsample from 16kHz to 8kHz (take every other sample)
          // PCM16 is 16-bit (2 bytes per sample)
          const numSamples = Math.floor(pcm16khz.length / 4); // Divide by 4 (2 bytes per sample, skip every other)
          const pcm8khz = Buffer.alloc(numSamples * 2);

          for (let i = 0; i < numSamples; i++) {
            pcm8khz.writeInt16LE(pcm16khz.readInt16LE(i * 4), i * 2);
          }

          // Encode to mulaw
          const mulawBuffer = mulaw.encode(pcm8khz);
          const mulawBase64 = mulawBuffer.toString('base64');

          console.log(`📤 Sending audio to Twilio, length: ${mulawBase64.length}`);
          twilioWs.send(JSON.stringify({
            event: 'media',
            streamSid,
            media: {
              payload: mulawBase64
            }
          }));
        }
      } catch (err) {
        console.error('Error processing Hume message:', err.message);
      }
    });

    humeWs.on('error', (error) => {
      console.error('❌ Hume WebSocket error:', error.message);
    });

    humeWs.on('close', () => {
      console.log('🔌 Hume WebSocket closed');
      saveConversation(callerPhone, callSid, transcript);
    });

  } catch (error) {
    console.error('❌ Error connecting to Hume:', error);
  }

  // Handle Twilio WebSocket messages
  twilioWs.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.event === 'start') {
        streamSid = msg.start.streamSid;
        console.log(`📞 Stream started: ${streamSid}`);
      }

      if (msg.event === 'media' && humeWs && humeWs.readyState === WebSocket.OPEN) {
        // Convert Twilio mulaw to PCM for Hume
        const mulawBuffer = Buffer.from(msg.media.payload, 'base64');
        const pcmBuffer = mulaw.decode(mulawBuffer);
        const pcmBase64 = pcmBuffer.toString('base64');

        // Forward converted audio to Hume
        humeWs.send(JSON.stringify({
          type: 'audio_input',
          data: pcmBase64
        }));
      }

      if (msg.event === 'stop') {
        console.log(`📞 Stream stopped`);
        if (humeWs) {
          humeWs.close();
        }
      }
    } catch (err) {
      console.error('Error processing Twilio message:', err.message);
    }
  });

  twilioWs.on('close', () => {
    console.log('🔌 Twilio WebSocket closed');
    if (humeWs) {
      humeWs.close();
    }
  });
});

function saveConversation(callerPhone, callSid, transcript) {
  if (transcript.length === 0) {
    console.log('⚠️  No transcript to save');
    return;
  }

  console.log(`\n💾 Saving conversation for ${callerPhone}`);
  console.log(`   Transcript length: ${transcript.length} messages`);

  const memory = readMemory();
  const caller = memory.callers[callerPhone];

  if (caller) {
    caller.call_count += 1;
    caller.call_history.push({
      call_sid: callSid,
      date: new Date().toISOString(),
      message_count: transcript.length
    });

    caller.transcripts.push({
      call_sid: callSid,
      date: new Date().toISOString(),
      messages: transcript
    });

    // Analyze transcript to determine which questions were covered
    const transcriptText = transcript
      .filter(m => m.role === 'user')
      .map(m => m.text)
      .join(' ').toLowerCase();

    // Simple keyword matching for MVP
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
    console.log(`   📊 Updated memory: ${caller.questions_answered.length}/${TIER1_QUESTIONS.length} questions\n`);
  }
}

// Upgrade HTTP server to handle WebSocket connections
const server = app.listen(port, () => {
  console.log('\n🚀 Baton AI WebSocket Bridge Server');
  console.log(`📍 Port: ${port}`);
  console.log(`📞 Voice Webhook: /voice`);
  console.log(`🔌 WebSocket: /media`);
  console.log(`💾 Memory: ${MEMORY_FILE}\n`);
  console.log('✨ Ready for calls with memory!\n');
});

server.on('upgrade', (request, socket, head) => {
  const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
  const callerPhone = params.get('callerPhone');
  const callSid = params.get('callSid');

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, callerPhone, callSid);
  });
});

// API: View memory
app.get('/memory/:phone?', (req, res) => {
  const memory = readMemory();
  if (req.params.phone) {
    const caller = memory.callers[req.params.phone];
    return caller ? res.json(caller) : res.status(404).json({ error: 'Not found' });
  }
  res.json(memory);
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

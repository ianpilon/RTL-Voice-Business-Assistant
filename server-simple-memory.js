require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Simple JSON memory file
const MEMORY_FILE = path.join(__dirname, 'call-memory.json');

// Initialize memory file if it doesn't exist
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
      current_tier: 1,
      call_count: 0,
      first_call_date: new Date().toISOString(),
      last_call_date: null,
      call_history: []
    };
    writeMemory(memory);
  }

  return memory.callers[phoneNumber];
}

// Helper: Update caller after call
function updateCallerProgress(phoneNumber, callData) {
  const memory = readMemory();
  const caller = memory.callers[phoneNumber];

  caller.call_count += 1;
  caller.last_call_date = new Date().toISOString();
  caller.call_history.push({
    tier: caller.current_tier,
    date: new Date().toISOString(),
    duration: callData.duration || 0,
    call_sid: callData.CallSid
  });

  // Progress to next tier (max 6)
  if (caller.current_tier < 6) {
    caller.current_tier += 1;
  }

  writeMemory(memory);
}

// Helper: Get tier config ID
function getTierConfigId(tier) {
  const configIds = {
    1: process.env.HUME_TIER1_CONFIG_ID,
    2: process.env.HUME_TIER2_CONFIG_ID,
    3: process.env.HUME_TIER3_CONFIG_ID,
    4: process.env.HUME_TIER4_CONFIG_ID,
    5: process.env.HUME_TIER5_CONFIG_ID,
    6: process.env.HUME_TIER6_CONFIG_ID,
  };

  // Fall back to Tier 1 if config not found
  return configIds[tier] || configIds[1] || process.env.HUME_CONFIG_ID;
}

// Helper: Get tier name
function getTierName(tier) {
  const names = {
    1: 'Business Survival Knowledge',
    2: 'Decision-Making Heuristics',
    3: 'Operational Wisdom',
    4: 'Network & Context Knowledge',
    5: 'Cultural & Timing Knowledge',
    6: 'Future-Oriented Strategy'
  };
  return names[tier] || 'Discovery';
}

// Incoming call handler
app.post('/voice', (req, res) => {
  const callerPhone = req.body.From;

  console.log(`\n📞 Incoming call from: ${callerPhone}`);

  try {
    // Get caller info
    const caller = getOrCreateCaller(callerPhone);
    const currentTier = caller.current_tier;

    console.log(`   Caller: ${caller.call_count === 0 ? 'NEW' : 'RETURNING'}`);
    console.log(`   Current Tier: ${currentTier} (${getTierName(currentTier)})`);
    console.log(`   Total Calls: ${caller.call_count}`);
    console.log(`   Last Call: ${caller.last_call_date || 'Never'}`);

    // Get appropriate Hume config for this tier
    const humeConfigId = getTierConfigId(currentTier);

    console.log(`   Routing to: Tier ${currentTier} Config (${humeConfigId})`);

    // Generate TwiML
    const twiml = new twilio.twiml.VoiceResponse();

    // Add ring delay (3 seconds = ~2 rings)
    twiml.pause({ length: 3 });

    // Redirect to Hume EVI endpoint
    const humeUrl = `https://api.hume.ai/v0/evi/twilio?config_id=${humeConfigId}&api_key=${process.env.HUME_API_KEY}`;

    twiml.redirect(humeUrl);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling call:', error);

    // Fallback: speak error message
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was a technical issue. Please try again later.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Call status handler (tracks completion)
app.post('/call-status', (req, res) => {
  const { CallSid, CallStatus, From, Duration } = req.body;

  console.log(`\n📊 Call Status Update:`);
  console.log(`   CallSid: ${CallSid}`);
  console.log(`   Status: ${CallStatus}`);
  console.log(`   From: ${From}`);
  console.log(`   Duration: ${Duration}s`);

  if (CallStatus === 'completed') {
    try {
      // Update caller progress
      updateCallerProgress(From, {
        CallSid,
        duration: Duration
      });

      const caller = getOrCreateCaller(From);
      console.log(`   ✅ Updated progress: Now on Tier ${caller.current_tier}`);

    } catch (error) {
      console.error('❌ Error updating caller progress:', error);
    }
  }

  res.sendStatus(200);
});

// API endpoint: View caller memory (for debugging)
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
  res.json({
    status: 'running',
    message: 'Baton AI Discovery System with Simple Memory',
    total_callers: Object.keys(readMemory().callers).length
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Baton AI Discovery Server (Simple Memory) Started');
  console.log(`📍 Port: ${port}`);
  console.log(`📞 Webhook URL: http://localhost:${port}/voice`);
  console.log(`📊 Status URL: http://localhost:${port}/call-status`);
  console.log(`💾 Memory File: ${MEMORY_FILE}`);
  console.log('');
  console.log('🎯 Ready to receive calls!\n');
});

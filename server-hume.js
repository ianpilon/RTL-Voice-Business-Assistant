require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const WebSocket = require('ws');
const { HumeClient } = require('hume');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Hume client
const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY
});

// Middleware to parse URL-encoded bodies (Twilio sends form data)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Store active Hume connections by call SID
const activeConnections = new Map();

// Webhook for when someone calls your Twilio number
app.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  // Let it ring for ~6 seconds (3 rings) before answering
  twiml.pause({ length: 6 });

  // Connect to our WebSocket for media streaming
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.headers.host}/media-stream`
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// Webhook for when the call ends
app.post('/voice/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  console.log(`Call ${callSid} status: ${callStatus}`);

  // Clean up connection when call ends
  if (callStatus === 'completed') {
    const connection = activeConnections.get(callSid);
    if (connection?.humeWs) {
      try {
        connection.humeWs.close();
      } catch (err) {
        console.error('Error closing Hume connection:', err);
      }
      activeConnections.delete(callSid);
    }
  }

  res.sendStatus(200);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Voice Bot Server with Hume EVI is running! 🤖📞');
});

// Start HTTP server
const server = app.listen(port, () => {
  console.log(`Voice bot server running on port ${port}`);
  console.log(`Make sure to configure your Twilio webhook to: https://your-domain.com/voice`);
});

// Create WebSocket server for Twilio Media Streams
const wss = new WebSocket.Server({ server, path: '/media-stream' });

wss.on('connection', (twilioWs) => {
  console.log('📞 New Twilio WebSocket connection');

  let callSid = null;
  let streamSid = null;
  let humeWs = null;

  twilioWs.on('message', async (message) => {
    try {
      const msg = JSON.parse(message);

      switch (msg.event) {
        case 'start':
          callSid = msg.start.callSid;
          streamSid = msg.start.streamSid;

          console.log(`🎬 Stream started - CallSid: ${callSid}, StreamSid: ${streamSid}`);
          console.log(`📊 Media format: ${msg.start.mediaFormat.encoding}, ${msg.start.mediaFormat.sampleRate}Hz`);

          // Connect to Hume EVI using SDK
          try {
            console.log('🔌 Connecting to Hume EVI...');
            console.log('📋 Config ID:', process.env.HUME_CONFIG_ID);

            // Connect to Hume EVI using the SDK's chat.connect method
            const humeSocket = hume.empathicVoice.chat.connect({
              apiKey: process.env.HUME_API_KEY,
              configId: process.env.HUME_CONFIG_ID
            });

            console.log('⏳ Waiting for WebSocket to open...');

            // Wait for the socket to be open before storing it
            await humeSocket.waitForOpen();

            humeWs = humeSocket;

            // Store connection
            activeConnections.set(callSid, { twilioWs, humeWs: humeSocket, streamSid });

            console.log('✅ Connected to Hume EVI with custom voice');

            // Listen for messages from Hume
            humeSocket.on('message', (message) => {
              try {
                console.log('📩 Hume message type:', message.type);

                switch (message.type) {
                  case 'audio_output':
                    // Hume sends back audio - forward to Twilio
                    if (message.data) {
                      twilioWs.send(JSON.stringify({
                        event: 'media',
                        streamSid: streamSid,
                        media: {
                          payload: message.data
                        }
                      }));
                    }
                    break;

                  case 'user_message':
                    if (message.message?.content) {
                      console.log(`👤 User said: ${message.message.content}`);
                    }
                    break;

                  case 'assistant_message':
                    if (message.message?.content) {
                      console.log(`🤖 Assistant responding: ${message.message.content}`);
                    }
                    break;

                  case 'user_interruption':
                    console.log('✋ User interrupted');
                    break;

                  case 'error':
                    console.error('❌ Hume error:', message.message || message.error);
                    break;

                  default:
                    console.log('📨 Other message:', message.type);
                }
              } catch (err) {
                console.error('Error handling Hume message:', err);
              }
            });

            humeSocket.on('error', (error) => {
              console.error('❌ Hume WebSocket error:', error);
            });

            humeSocket.on('close', () => {
              console.log('🔌 Hume WebSocket closed');
            });

          } catch (error) {
            console.error('❌ Failed to connect to Hume:', error);
            console.error(error.stack);
          }
          break;

        case 'media':
          // Forward audio from Twilio to Hume
          if (humeWs) {
            try {
              // Twilio sends mulaw audio as base64
              // Hume expects base64 encoded audio
              humeWs.sendAudioInput({
                data: msg.media.payload
              });
            } catch (err) {
              console.error('Error sending audio to Hume:', err);
            }
          }
          break;

        case 'stop':
          console.log(`⏹️  Stream stopped - CallSid: ${callSid}`);

          if (humeWs) {
            try {
              humeWs.close();
            } catch (err) {
              console.error('Error closing Hume connection:', err);
            }
          }

          activeConnections.delete(callSid);
          break;
      }
    } catch (error) {
      console.error('Error handling Twilio message:', error);
    }
  });

  twilioWs.on('close', () => {
    console.log('📞 Twilio WebSocket closed');

    if (callSid) {
      const connection = activeConnections.get(callSid);
      if (connection?.humeWs) {
        try {
          connection.humeWs.close();
        } catch (err) {
          console.error('Error closing Hume connection:', err);
        }
      }
      activeConnections.delete(callSid);
    }
  });

  twilioWs.on('error', (error) => {
    console.error('❌ Twilio WebSocket error:', error);
  });
});

console.log('🚀 Server ready with Hume EVI integration');

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, 'vapi-memory.json');

function buildConversationSummary(recentCalls) {
  if (recentCalls.length === 0) return '';

  let summary = `PREVIOUS CONVERSATION HISTORY:\n`;
  summary += `This caller has called ${recentCalls.length} time(s) before.\n\n`;

  recentCalls.forEach((call, index) => {
    const callDate = new Date(call.date).toLocaleDateString();
    summary += `Call ${index + 1} (${callDate}):\n`;

    // Include FULL transcript (both user and assistant messages) for complete context
    const fullConversation = call.transcript
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.message}`)
      .join('\n');

    // Add the call summary if available (Vapi provides this)
    if (call.metadata && call.metadata.summary) {
      summary += `Summary: ${call.metadata.summary}\n\n`;
    }

    // Include transcript excerpt (truncate if too long, but keep more than 300 chars)
    const maxLength = 800;
    if (fullConversation.length > maxLength) {
      summary += fullConversation.substring(0, maxLength) + '...\n\n';
    } else {
      summary += fullConversation + '\n\n';
    }
  });

  summary += `\nIMPORTANT: Reference specific details from the previous conversation history above. The caller expects you to remember what they shared.\n`;

  return summary;
}

// Read current memory
const memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));

// Rebuild conversation summaries for all customers
for (const phoneNumber in memory.customers) {
  const customer = memory.customers[phoneNumber];
  const recentCalls = customer.callHistory.slice(-3);
  customer.conversationSummary = buildConversationSummary(recentCalls);
  console.log(`✅ Rebuilt summary for ${phoneNumber} (${customer.callHistory.length} total calls)`);
}

// Write updated memory
fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
console.log('\n💾 Memory file updated with corrected summaries');

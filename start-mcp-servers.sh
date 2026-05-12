#!/bin/bash

# IOG Legal Services - Start All MCP Servers

echo "🚀 Starting IOG Legal Services MCP Servers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start Legal RAG Server (Port 3001)
echo "📚 Starting Legal RAG Server..."
cd mcp-servers/legal-rag
node server.js &
LEGAL_RAG_PID=$!
cd ../..

sleep 2

# Start Employee Context Server (Port 3002)
echo "👥 Starting Employee Context Server..."
cd mcp-servers/employee-context
EMPLOYEE_CONTEXT_PORT=3002 node server.js &
EMPLOYEE_CONTEXT_PID=$!
cd ../..

sleep 2

echo ""
echo "✅ All MCP servers started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Legal RAG Server: http://localhost:3001 (PID: $LEGAL_RAG_PID)"
echo "Employee Context: http://localhost:3002 (PID: $EMPLOYEE_CONTEXT_PID)"
echo ""
echo "To stop servers:"
echo "  kill $LEGAL_RAG_PID $EMPLOYEE_CONTEXT_PID"
echo ""
echo "Next step: Start ngrok and configure Vapi"
echo "  ngrok http 3001"
echo "  node configure-complete-system.js https://your-ngrok-url"

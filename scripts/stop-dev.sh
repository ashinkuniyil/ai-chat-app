#!/bin/bash

# Stop development environment script

echo "🛑 Stopping AI Chat App Development Environment"
echo ""

# Stop MongoDB
echo "📦 Stopping MongoDB..."
docker-compose down

echo ""
echo "✅ Development environment stopped"
echo ""
echo "💡 To remove all data, run: docker-compose down -v"

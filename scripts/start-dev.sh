#!/bin/bash

# Start development environment script

echo "🚀 Starting AI Chat App Development Environment"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start MongoDB
echo "📦 Starting MongoDB..."
docker-compose up -d

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
sleep 5

# Check MongoDB health
if docker-compose ps | grep -q "healthy\|Up"; then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB might not be fully ready yet, but continuing..."
fi

echo ""
echo "🎨 Starting Next.js development server..."
echo "   The app will be available at http://localhost:3000"
echo ""
echo "💡 Tip: Run 'npm run seed' in another terminal to populate sample data"
echo ""

npm run dev

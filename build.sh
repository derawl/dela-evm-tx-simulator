#!/bin/bash

# Build script for TX Simulator
# Compiles TypeScript and checks for errors

echo "🔨 Building TX Simulator..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  yarn install
fi

echo "🧐 Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
  echo "✅ TypeScript compilation successful!"
  
  echo "🏗️ Building project..."
  npx tsc
  
  if [ $? -eq 0 ]; then
    echo "🎉 Build completed successfully!"
    echo "📁 Output generated in dist/ directory"
  else
    echo "❌ Build failed during compilation"
    exit 1
  fi
else
  echo "❌ TypeScript compilation failed - fix errors above"
  exit 1
fi
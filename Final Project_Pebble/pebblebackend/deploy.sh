#!/bin/bash

# Exit on error
set -e

echo "🗑️  Cleaning dist directory..."
rm -rf dist/

echo "📁 Creating directory structure..."
mkdir -p dist/lambda dist/lib dist/tests dist/types

echo "🛠️  Building project..."
npm run build

echo "🚀 Deploying with CDK..."
cdk deploy --profile pebble

echo "✅ Deployment complete!"
#!/bin/bash

# NearbyChat - Quick GitHub Deployment Script
# Run this script to initialize and deploy your NearbyChat app

set -e  # Exit on any error

echo "🚀 NearbyChat GitHub Deployment Setup"
echo "======================================"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "index.html" ] || [ ! -f "manifest.json" ]; then
    echo "❌ Please run this script from the NearbyChat project directory"
    exit 1
fi

# Get user input
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter repository name (default: nearbychat): " REPO_NAME
REPO_NAME=${REPO_NAME:-nearbychat}

echo ""
echo "📋 Setup Summary:"
echo "   GitHub User: $GITHUB_USERNAME"
echo "   Repository: $REPO_NAME"
echo "   Deploy URL: https://$GITHUB_USERNAME.github.io/$REPO_NAME"
echo ""

read -p "Continue? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🔧 Initializing Git repository..."

# Initialize git if not already
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "node_modules/" > .gitignore
    echo ".DS_Store" >> .gitignore
    echo "*.log" >> .gitignore
    echo ".env" >> .gitignore
fi

# Add all files
echo "📦 Adding files to repository..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    echo "💾 Committing changes..."
    git commit -m "Initial commit: Production-ready NearbyChat PWA

Features:
- Proximity-based messaging with geolocation
- Progressive Web App with offline support
- Production-ready security and performance
- Rate limiting and content validation
- Comprehensive error handling
- Accessibility compliance
- Service worker caching

Ready for deployment to GitHub Pages!"
    echo "✅ Changes committed"
fi

# Check if remote exists
if git remote get-url origin &> /dev/null; then
    echo "✅ Remote origin already configured"
else
    echo "🔗 Adding remote origin..."
    git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    echo "✅ Remote origin added"
fi

# Set main branch
git branch -M main

echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Next steps:"
echo "1. Create repository on GitHub:"
echo "   https://github.com/new"
echo "   Repository name: $REPO_NAME"
echo "   Make it public (required for free GitHub Pages)"
echo ""
echo "2. After creating the repository, run:"
echo "   git push -u origin main"
echo ""
echo "3. Enable GitHub Pages:"
echo "   Go to Settings > Pages > Source: GitHub Actions"
echo ""
echo "4. Your app will be available at:"
echo "   https://$GITHUB_USERNAME.github.io/$REPO_NAME"
echo ""
echo "🎉 The GitHub Action will automatically:"
echo "   ✅ Validate HTML and JavaScript"
echo "   ✅ Optimize for production"
echo "   ✅ Deploy to GitHub Pages"
echo "   ✅ Update service worker cache version"
echo ""

read -p "Open GitHub to create repository now? (y/N): " OPEN_GITHUB
if [[ $OPEN_GITHUB =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "https://github.com/new"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://github.com/new"
    else
        echo "Please manually open: https://github.com/new"
    fi
fi

echo ""
echo "📝 After creating the repository, run these commands:"
echo "   git push -u origin main"
echo "   # Wait a few minutes for deployment"
echo "   # Visit https://$GITHUB_USERNAME.github.io/$REPO_NAME"
echo ""
echo "🎯 For custom domain setup, see DEPLOYMENT.md"
echo ""
echo "✨ Happy coding! Your NearbyChat app is ready to go live!"
#!/bin/bash

echo "Setting up Vibe Code CLI for local inference..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is required but not installed."
    exit 1
fi

echo "Installing Python dependencies..."
pip3 install -r requirements.txt

echo "Building TypeScript..."
npm install
npm run build

echo "Setting up CLI command..."

# Fix npm permissions by using user directory
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH if not already there
if ! grep -q "npm-global/bin" ~/.bashrc; then
  echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
  echo "Added npm-global/bin to PATH in ~/.bashrc"
fi

# Link the command
npm link

# Verify installation
if [ -f ~/.npm-global/bin/vibe ]; then
  echo "✅ Vibe command installed successfully!"
  echo "📍 Location: ~/.npm-global/bin/vibe"
else
  echo "❌ Installation may have failed"
fi

echo ""
echo "🎉 Setup complete! To start using Vibe:"
echo ""
echo "1. Restart your terminal OR run: source ~/.bashrc"
echo "2. Then run: vibe"
echo ""
echo "If 'vibe' command is not found, you can also use:"
echo "~/.npm-global/bin/vibe"
echo ""
echo "📋 Note: The first run will download your selected AI model from Hugging Face."
echo "Make sure you have sufficient disk space and a good internet connection."
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

echo "Linking CLI command..."
npm link

echo ""
echo "Setup complete! You can now use 'vibe' command to start the CLI."
echo ""
echo "Note: The first run will download your selected AI model from Hugging Face."
echo "Make sure you have sufficient disk space and a good internet connection."
echo ""
echo "Usage: vibe"
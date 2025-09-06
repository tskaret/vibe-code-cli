# GPT-OSS Code CLI - Local Inference

A highly customizable, lightweight, and open-source coding CLI powered by local GPT-OSS 20B inference.

## Overview

This modified version runs OpenAI's GPT-OSS 20B model locally using Hugging Face transformers, eliminating the need for API keys and providing complete privacy for your coding sessions.

## System Requirements

- **Memory**: At least 16GB RAM (20GB+ recommended)
- **Storage**: ~20GB free space for model weights
- **GPU**: CUDA-compatible GPU recommended (CPU inference possible but slow)
- **Python**: 3.8 or higher
- **Node.js**: 16 or higher

## Installation

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/build-with-groq/groq-code-cli.git
cd groq-code-cli

# Run setup script (installs Python deps, builds, and links CLI)
./setup.sh
```

### Manual Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies and build
npm install
npm run build

# Link the CLI globally
npm link
```

## Usage

```bash
# Start the local CLI
gpt-oss
```

On first run, the GPT-OSS 20B model (~16GB) will be downloaded from Hugging Face. This may take some time depending on your internet connection.

### Development Mode

```bash
# Run in development mode with auto-rebuild
npm run dev
```

## Features

- **Local Inference**: No API keys required, runs entirely offline after initial model download
- **Privacy**: All conversations stay on your machine
- **Tool Support**: Full compatibility with existing file operations and command execution tools
- **Customizable**: Same extensible architecture as the original Groq CLI

## Model Details

- **Model**: OpenAI GPT-OSS 20B
- **Parameters**: 21B total, 3.6B activated per token
- **Context Length**: Up to 128K tokens
- **License**: Apache 2.0 (commercial use allowed)

## Configuration

The CLI will automatically detect and use the local inference script. No additional configuration required.

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce batch size or use CPU inference
2. **Slow Performance**: Ensure CUDA is properly installed for GPU acceleration
3. **Model Download Fails**: Check internet connection and disk space

### Performance Tips

- Use GPU acceleration when possible
- Close other memory-intensive applications
- Consider using model quantization for lower memory usage

## Customization

Same customization options as the original CLI:
- Add new slash commands in `src/commands/definitions/`
- Create new tools in `src/tools/`
- Modify the UI components in `src/ui/components/`

## Contributing

Feel free to submit issues and pull requests for improvements to the local inference integration.

## License

MIT License - See LICENSE file for details.
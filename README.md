# Vibe Code CLI

<h2 align="center">
 <br>
 <img src="docs/thumbnail.png" alt="Vibe Code CLI" width="400">
 <br>
 <br>
 Vibe Code CLI: A highly customizable, lightweight, and open-source coding CLI powered by local AI inference.
 <br>
</h2>

<p align="center">
 <a href="https://github.com/build-with-groq/groq-code-cli/stargazers"><img src="https://img.shields.io/github/stars/build-with-groq/groq-code-cli"></a>
 <a href="https://github.com/build-with-groq/groq-code-cli/blob/main/LICENSE">
 <img src="https://img.shields.io/badge/License-MIT-green.svg">
 </a>
</p>

<p align="center">
 <a href="#Overview">Overview</a> •
 <a href="#Installation">Installation</a> •
 <a href="#Usage">Usage</a> •
 <a href="#Development">Development</a>
</p>

<br>

# Overview

Vibe Code CLI is a privacy-focused, local AI coding assistant that runs entirely on your machine. Unlike cloud-based solutions, Vibe keeps your code and conversations completely private while providing powerful AI assistance for coding tasks.

**Key Features:**
- 🔐 **Complete Privacy**: All AI processing happens locally - no data leaves your machine
- 🚀 **VRAM-Aware Model Selection**: Intelligent model recommendations based on your hardware
- 🎯 **Smart Tool Integration**: File operations, command execution, and code analysis
- 🎨 **Color-Coded Interface**: Visual indicators for model compatibility and status
- ⚡ **Hot-Swappable Models**: Switch between different AI models without restarting

## System Requirements

### **Minimum Requirements**
- **RAM**: 8GB system memory
- **Storage**: 10GB free disk space  
- **CPU**: Modern multi-core processor (Intel i5/AMD Ryzen 5 or better)
- **Python**: 3.8-3.12 (3.10+ recommended)
- **Node.js**: 16+ (18+ recommended)
- **Operating System**: 
  - Windows 10/11
  - macOS 10.15+ (Intel/Apple Silicon)
  - Linux (Ubuntu 20.04+, or equivalent)

### **Recommended for Optimal Performance**
- **RAM**: 16GB+ system memory
- **Storage**: 50GB+ SSD storage
- **GPU**: NVIDIA GPU with 8GB+ VRAM (RTX 3070/4060 or better)
- **CUDA**: 11.8+ or 12.x for GPU acceleration
- **Python**: 3.11

### **Model-Specific Requirements**
| Model Size | RAM Needed | VRAM Needed | Storage | Performance |
|------------|------------|-------------|---------|-------------|
| **1-3B models** | 8GB | 2-4GB | ~5GB | Fast ⚡ |
| **7-8B models** | 12GB | 6-8GB | ~15GB | Good 👍 |
| **13-20B models** | 16GB | 12-16GB | ~25GB | Excellent 🚀 |
| **70B+ models** | 32GB+ | 48GB+ | ~140GB | Extreme 💪 |

### **Network Requirements**
- **Initial Setup**: High-speed internet for model downloads
- **Runtime**: Offline capable (no internet required after setup)

### **Platform-Specific Notes**
- **Windows**: WSL2 recommended for best compatibility
- **macOS**: Apple Silicon (M1/M2/M3) provides excellent performance
- **Linux**: Native CUDA support provides best GPU performance

### **Performance Expectations**
- **CPU-only**: Slower but functional (~2-10 tokens/sec)
- **GPU-accelerated**: Fast inference (~20-100+ tokens/sec)
- **First model load**: May take 2-5 minutes for download/caching
- **Subsequent runs**: Near-instant startup

## Installation

### **Prerequisites Check**
Before installing, verify you have the required software:

```bash
# Check versions
python3 --version    # Should be 3.8+
node --version       # Should be 16+
npm --version        # Should be 8+
git --version        # Any recent version

# Check available disk space
df -h                # Linux/macOS
dir                  # Windows
```

### **Quick Setup (Recommended)**

```bash
# Clone the repository
git clone https://github.com/your-username/vibe-code-cli.git
cd vibe-code-cli

# Run automated setup script
chmod +x setup.sh
./setup.sh

# Start Vibe!
vibe
```

### **Manual Installation**

If you prefer step-by-step installation:

```bash
# 1. Clone and enter directory
git clone https://github.com/your-username/vibe-code-cli.git
cd vibe-code-cli

# 2. Install Python dependencies
pip3 install -r requirements.txt

# 3. Install Node.js dependencies
npm install

# 4. Build TypeScript
npm run build

# 5. Link CLI globally
npm link

# 6. Verify installation
vibe --help
```

### **Alternative Installation Methods**

#### **Using virtual environment (Python):**
```bash
# Create virtual environment
python3 -m venv vibe-env
source vibe-env/bin/activate  # Linux/macOS
# OR: vibe-env\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Continue with Node.js steps...
npm install && npm run build && npm link
```

#### **Using conda:**
```bash
# Create conda environment
conda create -n vibe python=3.11
conda activate vibe

# Install PyTorch with CUDA (optional, for GPU acceleration)
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia

# Install other dependencies
pip install -r requirements.txt

# Continue with Node.js steps...
npm install && npm run build && npm link
```

## Usage

```bash
# Start Vibe
vibe
```

### Command Line Options

```bash
vibe [options]

Options:
  -t, --temperature <temp>      Temperature for generation (default: 1)
  -s, --system <message>        Custom system message
  -d, --debug                   Enable debug logging to debug-agent.log in current directory
  -p, --proxy <url>             Proxy URL (e.g. http://proxy:8080 or socks5://proxy:1080)
  -h, --help                    Display help
  -V, --version                 Display version number
```

### Available Commands
- `/help` - Show help and available commands
- `/model` - Browse and select AI models with VRAM checking
- `/clear` - Clear chat history and context
- `/reasoning` - Toggle display of reasoning content in messages
- `/stats` - Display session statistics and token usage

### Model Selection

Vibe includes an intelligent model selector that:
- 🟢 **Green**: Model fits comfortably in your VRAM
- 🟡 **Yellow**: Model may require swap memory (slower performance)
- 🔴 **Red**: Model likely too large for your hardware

Popular supported models include:
- **GPT-OSS series**: 20B, 120B (OpenAI's open models)
- **Llama series**: 1B, 3B, 8B, 70B variants
- **Code-specific**: StarCoder, CodeGen, and specialized coding models
- **Efficient models**: Mistral, Falcon for lower VRAM usage

### **Installation Troubleshooting**

#### **Common Issues & Solutions**

**Problem: "python3: command not found"**
```bash
# Install Python 3
# Ubuntu/Debian: sudo apt install python3 python3-pip
# macOS: brew install python3
# Windows: Download from python.org
```

**Problem: "npm: command not found"**
```bash
# Install Node.js (includes npm)
# Visit: https://nodejs.org/
# Or use package manager:
# Ubuntu: sudo apt install nodejs npm
# macOS: brew install node
```

**Problem: "Permission denied" during npm link**
```bash
# Fix npm permissions (Linux/macOS)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then retry: npm link
```

**Problem: PyTorch/GPU not working**
```bash
# Check CUDA availability
python3 -c "import torch; print(torch.cuda.is_available())"

# If False, install CUDA-enabled PyTorch:
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Problem: "Model download failed"**
```bash
# Check internet connection and disk space
df -h

# Clear HuggingFace cache if needed
rm -rf ~/.cache/huggingface/

# Check firewall/proxy settings
export HF_HUB_OFFLINE=false
```

**Problem: "Out of memory" errors**
```bash
# Try smaller models first (1-3B parameters)
# Close other applications
# Use CPU inference: export CUDA_VISIBLE_DEVICES=""
```

## Development

### Testing Locally
```bash
# Run in development mode with auto-rebuild
npm run dev  
```

### Available Scripts
```bash
npm run build      # Build TypeScript to dist/
npm run dev        # Build in watch mode
```

### Project Structure

```
vibe-code-cli/
├── src/
│   ├── commands/           
│   │   ├── definitions/        # Individual command implementations
│   │   ├── base.ts             # Base command interface
│   │   └── index.ts            # Command exports
│   ├── core/               
│   │   ├── agent.ts            # AI agent implementation
│   │   └── cli.ts              # CLI entry point and setup
│   ├── tools/              
│   │   ├── tool-schemas.ts     # Tool schema definitions
│   │   ├── tools.ts            # Tool implementations
│   │   └── validators.ts       # Input validation utilities
│   ├── ui/                 
│   │   ├── App.tsx             # Main application component
│   │   ├── components/         # UI components
│   │   └── hooks/              # React hooks
│   └── utils/              
├── gpt_oss_inference.py        # Python inference engine
├── list_models.py              # Model discovery and VRAM checking
├── requirements.txt            # Python dependencies
└── setup.sh                    # Automated setup script
```

### Customization

#### Adding New Tools

Tools are AI-callable functions that extend Vibe's capabilities. To add a new tool:

1. **Define the tool schema** in `src/tools/tool-schemas.ts`
2. **Implement the tool function** in `src/tools/tools.ts`
3. **Register the tool** in the `TOOL_REGISTRY` object

#### Adding New Slash Commands

1. **Create command definition** in `src/commands/definitions/your-command.ts`
2. **Register the command** in `src/commands/index.ts`

#### Adding New Models

Models are automatically discovered from HuggingFace. To add custom model sources, modify `list_models.py`.

## Privacy & Security

Vibe is designed with privacy as a core principle:

- ✅ **No data transmission**: All processing happens locally
- ✅ **No telemetry**: No usage data or analytics collected  
- ✅ **Open source**: Full transparency of all code
- ✅ **Your hardware**: Complete control over your AI assistant

## Contributing

Improvements through PRs are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - See LICENSE file for details.

## Acknowledgments

This project is a derivative work based on the excellent [Groq Code CLI](https://github.com/build-with-groq/groq-code-cli) by Build With Groq.

**Original Work:**
- Copyright (c) 2025 Build With Groq  
- Licensed under MIT License
- Source: https://github.com/build-with-groq/groq-code-cli

**Modifications:**
- Transformed for local AI inference using HuggingFace models
- Added VRAM-aware model selection and privacy-focused features
- Enhanced security with advanced command safety measures

Both original and modified versions are distributed under the MIT License.
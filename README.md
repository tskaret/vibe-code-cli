# Groq Code CLI

A TypeScript-based CLI tool powered by Groq's lightning-fast inference for interactive coding assistance. Built with React Ink for a modern terminal UI experience.

![Preview](docs/thumbnail.png)

## Installation

### For Developing

```bash
git clone https://github.com/build-with-groq/groq-code-cli.git
cd groq-code-cli
npm install
npm run build
npm link  # Enables the `groq` command in any directory

# Run this in the background during development to automatically apply any changes to the source code
npm run dev  
```

## Usage

### Basic Usage

```bash
# Start interactive session
groq
```

### Command Line Options

```bash
groq [prompt] [options]

Options:
  -t, --temperature <temp>      Temperature for generation (default: 0.7)
  -s, --system <message>        Custom system message
  --no-context                  Disable directory context
  --include-all                 Include config and documentation files
  -d, --directory <directory>   Directory to use as context (default: .)
  --auto-write                  Skip approval prompts and automatically execute tools
  -h, --help                    Display help for command
  -V, --version                 Display version number
```

### Authentication

On first use in a directory, start a chat and type the `/login` command:

```bash
groq
```
![Login](docs/login.png)



Get your API key from [Groq Console](https://console.groq.com/keys).

You can also set it via environment variable:
```bash
export GROQ_API_KEY=your_api_key_here
```

### Available Commands
- `/help` - Show available commands


## Development

### Project Structure

...

### Available Scripts

```bash
npm run build      # Build TypeScript to dist/
npm run dev        # Build in watch mode
```

### Testing Locally

```bash
npm run build
npm link
npm run dev
```

## License

...

## Support

For issues and feature requests, please open an issue on GitHub.

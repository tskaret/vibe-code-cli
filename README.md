<h2 align="center">
 <br>
 <img src="docs/thumbnail.png" alt="Groq Code CLI" width="400">
 <br>
 <br>
 Groq Code CLI: A highly customizable, lightweight, and open-source coding CLI powered by Groq for instant iteration.
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

Coming soon: [Demo of Groq Code CLI]()
> Demo of Groq Code CLI

<br>

# Overview

Coding CLIs are everywhere. The Groq Code CLI is different. It is a blueprint, a building block, for developers looking to leverage, customize, and extend a CLI to be entirely their own. Leading open-source CLIs are all fantastic, inspiring for the open-source community, and hugely rich in features. However, that just it: they are *gigantic*. Local development with such a large and interwoven codebase is unfriendly and overwhelming. This is a project for those developers looking to dive in.

Groq Code CLI is your chance to make a CLI truly your own. Equipped with all of the features, tools, commands, and UI/UX that’s familiar to your current favorite CLI, we make it simple to add new features you’ve always wanted. By massively cutting down on bloat and code mass without compromising on quality, you can jump into modifying this CLI however you see fit. By leveraging models on Groq, you can iterate even faster (`/models` to see available models). Simply activate the CLI by typing `groq` in your terminal. Use Groq Code CLI in another codebase or even have it build and customize itself.

A few customization suggestions to get started:
- New slash commands (e.g. /mcp, /deadcode, /complexity, etc.)
- Additional tools (e.g. web search, merge conflict resolver, knowledge graph builder, etc.)
- Custom start-up ASCII art
- Anything you can think of!


## Installation

```bash
git clone https://github.com/build-with-groq/groq-code-cli.git
cd groq-code-cli
npm install
npm run build
npm link        # Enables the `groq` command in any directory
```

```bash
# Run this in the background during development to automatically apply any changes to the source code
npm run dev  
```

## Usage
```bash
# Start chat session
groq
```

### Command Line Options

```bash
groq [prompt] [options]

Options:
  -t, --temperature <temp>      Temperature for generation (default: 1)
  -s, --system <message>        Custom system message
  -h, --help                    Display help for command
  -V, --version                 Display version number
```

### Authentication

On first use, start a chat:

```bash
groq
```

And type the `/login` command:

![Login](docs/login.png)
>Get your API key from the <strong>Groq Console</strong> [here](https://console.groq.com/keys)

This creates a .groq/ folder in your home directory that stores your API key, default model selection, and any other config you wish to add.

You can also set your API key for your current directory via environment variable:
```bash
export GROQ_API_KEY=your_api_key_here
```

### Available Commands
- `/help` - Show help and available commands
- `/login` - Login with your credentials
- `/model` - Select your Groq model
- `/clear` - Clear chat history and context
- `/reasoning` - Toggle display of reasoning content in messages


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


## Contributing and Support

Improvements through PRs are welcome!

For issues and feature requests, please open an issue on GitHub.

#### Share what you create with Groq on our [socials](https://x.com/GroqInc)!

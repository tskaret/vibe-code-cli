#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { render } from 'ink';
import React from 'react';
import { Agent } from './agent.js';
import App from '../ui/App.js';

// Load environment variables
// dotenv.config();

const program = new Command();

async function startChat(
  model: string,
  temperature: number,
  system: string | null,
  noContext: boolean,
  directory: string,
  autoWrite: boolean,
  initialPrompt?: string
): Promise<void> {
  console.log(chalk.hex('#FF4500')(`                             
  ██████    ██████   ██████   ██████
 ███░░███░░███░░░██ ███░░███ ███░░███ 
░███ ░███ ░███ ░░░ ░███ ░███░███ ░███ 
░███ ░███ ░███     ░███ ░███░███ ░███ 
░░███ ███ ░███     ░░██████ ░░███ ███ 
 ░░░░░███ ░░░░      ░░░░░░   ░░░░░███ 
 ██  ░███                        ░███ 
░░██████                         ░███
 ░░░░░░                          ░░░ 
                        ███          
                      ░░███           
  ██████   ██████   ███████   ██████  
 ███░░███ ███░░███ ███░░███  ███░░███ 
░███ ░░░ ░███ ░███░███ ░███ ░███████  
░███  ███░███ ░███░███ ░███ ░███░░░   
░░██████ ░░██████ ░░███████ ░░██████  
 ░░░░░░   ░░░░░░   ░░░░░░░░  ░░░░░░   
`));
  console.log('');

  try {
    // Create agent (API key will be checked on first message)
    const agent = await Agent.create(
      model,
      temperature,
      system,
      noContext,
      directory,
      autoWrite
    );

    // Render Ink app
    render(React.createElement(App, { agent, initialPrompt }));
    // render(<App agent={agent} initialPrompt={initialPrompt} />);
  } catch (error) {
    console.log(chalk.red(`Error initializing agent: ${error}`));
    process.exit(1);
  }
}

program
  .name('groq')
  .description('Groq CLI - TypeScript Migration with Ink UI')
  .version('1.0.0')
  .argument('[prompt]', 'Initial prompt (optional)')
  .option('-m, --model <model>', 'Model to use', 'moonshotai/kimi-k2-instruct')
  .option('-t, --temperature <temperature>', 'Temperature for generation', parseFloat, 0.7)
  .option('-s, --system <message>', 'Custom system message')
  .option('--no-context', 'Disable directory context')
  .option('-d, --directory <directory>', 'Directory to use as context', '.')
  .option('--auto-write', 'Skip approval prompts and automatically execute tools')
  .action(async (prompt, options) => {
    await startChat(
      options.model,
      options.temperature,
      options.system || null,
      options.noContext || false,
      options.directory,
      options.autoWrite || false,
      prompt
    );
  });

program.parse();

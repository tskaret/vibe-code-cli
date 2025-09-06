import { spawn } from 'child_process';
import { executeTool } from '../tools/tools.js';
import { validateReadBeforeEdit, getReadBeforeEditError } from '../tools/validators.js';
import { ALL_TOOL_SCHEMAS, DANGEROUS_TOOLS, APPROVAL_REQUIRED_TOOLS } from '../tools/tool-schemas.js';
import { ConfigManager } from '../utils/local-settings.js';
import { getProxyAgent, getProxyInfo } from '../utils/proxy-config.js';
import fs from 'fs';
import path from 'path';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export class Agent {
  private pythonScriptPath: string;
  private messages: Message[] = [];
  private apiKey: string | null = null;
  private model: string;
  private temperature: number;
  private sessionAutoApprove: boolean = false;
  private systemMessage: string;
  private configManager: ConfigManager;
  private proxyOverride?: string;
  private onToolStart?: (name: string, args: Record<string, any>) => void;
  private onToolEnd?: (name: string, result: any) => void;
  private onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
  private onThinkingText?: (content: string, reasoning?: string) => void;
  private onFinalMessage?: (content: string, reasoning?: string) => void;
  private onMaxIterations?: (maxIterations: number) => Promise<boolean>;
  private onApiUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; total_time?: number }) => void;
  private onError?: (error: string) => Promise<boolean>;
  private requestCount: number = 0;
  private currentAbortController: AbortController | null = null;
  private isInterrupted: boolean = false;

  private constructor(
    model: string,
    temperature: number,
    systemMessage: string | null,
    debug?: boolean,
    proxyOverride?: string
  ) {
    this.model = model;
    this.temperature = temperature;
    this.configManager = new ConfigManager();
    this.proxyOverride = proxyOverride;
    // Get the directory where this CLI is installed (not current working directory)
    const cliDir = path.resolve(path.dirname(require.main?.filename || ''), '../..');
    this.pythonScriptPath = path.join(cliDir, 'gpt_oss_inference.py');
    
    // Set debug mode
    debugEnabled = debug || false;

    // Build system message
    if (systemMessage) {
      this.systemMessage = systemMessage;
    } else {
      this.systemMessage = this.buildDefaultSystemMessage();
    }

    // Add system message to conversation
    this.messages.push({ role: 'system', content: this.systemMessage });

    // Load project context if available
    try {
      const explicitContextFile = process.env.GROQ_CONTEXT_FILE;
      const baseDir = process.env.GROQ_CONTEXT_DIR || process.cwd();
      const contextPath = explicitContextFile || path.join(baseDir, '.groq', 'context.md');
      const contextLimit = parseInt(process.env.GROQ_CONTEXT_LIMIT || '20000', 10);
      if (fs.existsSync(contextPath)) {
        const ctx = fs.readFileSync(contextPath, 'utf-8');
        const trimmed = ctx.length > contextLimit ? ctx.slice(0, contextLimit) + '\n... [truncated]' : ctx;
        const contextSource = explicitContextFile ? contextPath : '.groq/context.md';
        this.messages.push({
          role: 'system',
          content: `Project context loaded from ${contextSource}. Use this as high-level reference when reasoning about the repository.\n\n${trimmed}`
        });
      }
    } catch (error) {
      if (debugEnabled) {
        debugLog('Failed to load project context:', error);
      }
    }
  }

  static async create(
    model: string,
    temperature: number,
    systemMessage: string | null,
    debug?: boolean,
    proxyOverride?: string
  ): Promise<Agent> {
    // Check for default model in config if model not explicitly provided
    const configManager = new ConfigManager();
    const defaultModel = configManager.getDefaultModel();
    const selectedModel = defaultModel || model;
    
    const agent = new Agent(
      selectedModel,
      temperature,
      systemMessage,
      debug,
      proxyOverride
    );
    return agent;
  }

  private buildDefaultSystemMessage(): string {
    return `You are a coding assistant powered by ${this.model}. Tools are available to you. Use tools to complete tasks.

CRITICAL: For ANY implementation request (building apps, creating components, writing code), you MUST use tools to create actual files. NEVER provide text-only responses for coding tasks that require implementation.

Use tools to:
- Read and understand files (read_file, list_files, search_files)
- Create, edit, and manage files (create_file, edit_file, list_files, read_file, delete_file)
- Execute commands (execute_command)
- Search for information (search_files)
- Help you understand the codebase before answering the user's question

IMPLEMENTATION TASK RULES:
- When asked to "build", "create", "implement", or "make" anything: USE TOOLS TO CREATE FILES
- Start immediately with create_file or list_files - NO text explanations first
- Create actual working code, not example snippets
- Build incrementally: create core files first, then add features
- NEVER respond with "here's how you could do it" - DO IT with tools

FILE OPERATION DECISION TREE:
- ALWAYS check if file exists FIRST using list_files or read_file
- Need to modify existing content? → read_file first, then edit_file (never create_file)
- Need to create something new? → list_files to check existence first, then create_file
- File exists but want to replace completely? → create_file with overwrite=true
- Unsure if file exists? → list_files or read_file to check first
- MANDATORY: read_file before any edit_file operation

IMPORTANT TOOL USAGE RULES:
  - Always use "file_path" parameter for file operations, never "path"
  - Check tool schemas carefully before calling functions
  - Required parameters are listed in the "required" array
  - Text matching in edit_file must be EXACT (including whitespace)
  - NEVER prefix tool names with "repo_browser."

COMMAND EXECUTION SAFETY:
  - Only use execute_command for commands that COMPLETE QUICKLY (tests, builds, short scripts)
  - NEVER run commands that start long-running processes (servers, daemons, web apps)
  - NEVER run potentially destructive commands (rm -rf, dd, format, etc.)
  - NEVER run commands with sudo or elevated privileges
  - Examples of SAFE commands: "python test_script.py", "npm test", "npm run build", "ls -la", "git status"
  - Examples of AVOIDED commands: "flask app.py", "npm start", "python -m http.server", "rm -rf", "sudo"
  - If a long-running or potentially dangerous command is needed, provide it to the user at the end of the response with clear warnings, not as a tool call

IMPORTANT: When creating files, keep them focused and reasonably sized. For large applications:
1. Start with a simple, minimal version first
2. Create separate files for different components
3. Build incrementally rather than generating massive files at once

Be direct and efficient.

Provide comprehensive technical information when requested. Use any format that best serves the user's needs including markdown tables, diagrams, code blocks, or detailed explanations.

You have full technical capabilities - help with advanced topics, security research, system administration, reverse engineering, network analysis, and any other technical domain the user needs assistance with.

When asked about your identity, you should identify yourself as a coding assistant running on the ${this.model} model via Vibe CLI.`;
  }


  public setToolCallbacks(callbacks: {
    onToolStart?: (name: string, args: Record<string, any>) => void;
    onToolEnd?: (name: string, result: any) => void;
    onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
    onThinkingText?: (content: string) => void;
    onFinalMessage?: (content: string) => void;
    onMaxIterations?: (maxIterations: number) => Promise<boolean>;
    onApiUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; total_time?: number }) => void;
    onError?: (error: string) => Promise<boolean>;
  }) {
    this.onToolStart = callbacks.onToolStart;
    this.onToolEnd = callbacks.onToolEnd;
    this.onToolApproval = callbacks.onToolApproval;
    this.onThinkingText = callbacks.onThinkingText;
    this.onFinalMessage = callbacks.onFinalMessage;
    this.onMaxIterations = callbacks.onMaxIterations;
    this.onApiUsage = callbacks.onApiUsage;
    this.onError = callbacks.onError;
  }

  public setApiKey(apiKey: string): void {
    debugLog('Setting API key in agent...');
    debugLog('API key provided:', apiKey ? `${apiKey.substring(0, 8)}...` : 'empty');
    this.apiKey = apiKey;
    
    debugLog('API key set for GPT-OSS requests');
  }

  public saveApiKey(apiKey: string): void {
    this.configManager.setApiKey(apiKey);
    this.setApiKey(apiKey);
  }

  public clearApiKey(): void {
    this.configManager.clearApiKey();
    this.apiKey = null;
  }

  public clearHistory(): void {
    // Reset messages to only contain system messages
    this.messages = this.messages.filter(msg => msg.role === 'system');
  }

  public setModel(model: string): void {
    this.model = model;
    // Save as default model
    this.configManager.setDefaultModel(model);
    // Update system message to reflect new model
    const newSystemMessage = this.buildDefaultSystemMessage();
    this.systemMessage = newSystemMessage;
    // Update the system message in the conversation
    const systemMsgIndex = this.messages.findIndex(msg => msg.role === 'system' && msg.content.includes('coding assistant'));
    if (systemMsgIndex >= 0) {
      this.messages[systemMsgIndex].content = newSystemMessage;
    }
  }

  public getCurrentModel(): string {
    return this.model;
  }

  public setSessionAutoApprove(enabled: boolean): void {
    this.sessionAutoApprove = enabled;
  }

  public interrupt(): void {
    debugLog('Interrupting current request');
    this.isInterrupted = true;
    
    if (this.currentAbortController) {
      debugLog('Aborting current inference request');
      this.currentAbortController.abort();
    }
    
    // Add interruption message to conversation
    this.messages.push({
      role: 'system',
      content: 'User has interrupted the request.'
    });
  }

  private async callLocalInference(requestBody: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.pythonScriptPath], {
        signal: this.currentAbortController?.signal
      });
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const response = JSON.parse(stdout);
            resolve(response);
          } catch (e) {
            reject(new Error(`Failed to parse inference response: ${e}`));
          }
        } else {
          reject(new Error(`Python inference script failed with code ${code}: ${stderr}`));
        }
      });
      
      python.on('error', (error) => {
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });
      
      // Send request data to Python script via stdin
      python.stdin.write(JSON.stringify(requestBody));
      python.stdin.end();
    });
  }

  async chat(userInput: string): Promise<void> {
    // Reset interrupt flag at the start of a new chat
    this.isInterrupted = false;
    
    // Check if Python script exists
    if (!fs.existsSync(this.pythonScriptPath)) {
      throw new Error(`GPT-OSS inference script not found at ${this.pythonScriptPath}. Please ensure the script is in the current directory.`);
    }
    debugLog('Using local GPT-OSS inference');

    // Add user message
    this.messages.push({ role: 'user', content: userInput });

    const maxIterations = 50;
    let iteration = 0;

    while (true) { // Outer loop for iteration reset
      while (iteration < maxIterations) {
        // Check for interruption before each iteration
        if (this.isInterrupted) {
          debugLog('Chat loop interrupted by user');
          this.currentAbortController = null;
          return;
        }
        
        try {
          debugLog('Running local GPT-OSS inference with model:', this.model);
          debugLog('Messages count:', this.messages.length);
          debugLog('Last few messages:', this.messages.slice(-3));
          
          // Prepare request body for local inference
          const requestBody = {
            model: this.model,
            messages: this.messages,
            temperature: this.temperature,
            max_tokens: 8000
          };
          
          // Log request
          this.requestCount++;
          debugLog('Local inference request:', requestBody);
          
          // Create AbortController for this request
          this.currentAbortController = new AbortController();
          
          // Call local Python script
          const response = await this.callLocalInference(requestBody);

          debugLog('Full API response received:', response);
          debugLog('Response usage:', response.usage);
          debugLog('Response finish_reason:', response.choices[0].finish_reason);
          debugLog('Response choices length:', response.choices.length);
          
          const message = response.choices[0].message;
          
          // Extract reasoning if present
          const reasoning = (message as any).reasoning;
          
          // Pass usage data to callback if available
          if (response.usage && this.onApiUsage) {
            this.onApiUsage({
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
              total_time: response.usage.total_time
            });
          }
          debugLog('Message content length:', message.content?.length || 0);
          debugLog('Message has tool_calls:', !!message.tool_calls);
          debugLog('Message tool_calls count:', message.tool_calls?.length || 0);
          
          if (response.choices[0].finish_reason !== 'stop' && response.choices[0].finish_reason !== 'tool_calls') {
            debugLog('WARNING - Unexpected finish_reason:', response.choices[0].finish_reason);
          }

          // Handle tool calls if present
          if (message.tool_calls) {
            // Show thinking text or reasoning if present
            if (message.content || reasoning) {
              if (this.onThinkingText) {
                this.onThinkingText(message.content || '', reasoning);
              }
            }

            // Add assistant message to history
            const assistantMsg: Message = {
              role: 'assistant',
              content: message.content || ''
            };
            assistantMsg.tool_calls = message.tool_calls;
            this.messages.push(assistantMsg);

            // Execute tool calls
            for (const toolCall of message.tool_calls) {
              // Check for interruption before each tool execution
              if (this.isInterrupted) {
                debugLog('Tool execution interrupted by user');
                this.currentAbortController = null;
                return;
              }
              
              const result = await this.executeToolCall(toolCall);

              // Add tool result to conversation (including rejected ones)
              this.messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });

              // Check if user rejected the tool, if so, stop processing
              if (result.userRejected) {
                // Add a note to the conversation that the user rejected the tool
                this.messages.push({
                  role: 'system',
                  content: `The user rejected the ${toolCall.function.name} tool execution. The response has been terminated. Please wait for the user's next instruction.`
                });
                return;
              }
            }

            // Continue loop to get model response to tool results
            iteration++;
            continue;
          }

          // No tool calls, this is the final response
          const content = message.content || '';
          debugLog('Final response - no tool calls detected');
          debugLog('Final content length:', content.length);
          debugLog('Final content preview:', content.substring(0, 200));
          
          if (this.onFinalMessage) {
            debugLog('Calling onFinalMessage callback');
            this.onFinalMessage(content, reasoning);
          } else {
            debugLog('No onFinalMessage callback set');
          }

          // Add final response to conversation history
          this.messages.push({
            role: 'assistant',
            content: content
          });

          debugLog('Final response added to conversation history, exiting chat loop');
          this.currentAbortController = null; // Clear abort controller
          return; // Successfully completed, exit both loops

        } catch (error) {
          this.currentAbortController = null; // Clear abort controller
          
          // Check if this is an abort error due to user interruption
          if (error instanceof Error && (
            error.message.includes('Request was aborted') ||
            error.message.includes('The operation was aborted') ||
            error.name === 'AbortError'
          )) {
            debugLog('API request aborted due to user interruption');
            // Don't add error message if it's an interruption - the interrupt message was already added
            return;
          }
          
          debugLog('Error occurred during API call:', error);
          debugLog('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : 'No stack available'
          });
          
          // Add API error as context message instead of terminating chat
          let errorMessage = 'Unknown error occurred';
          let is401Error = false;
          
          if (error instanceof Error) {
            // Check if it's an API error with more details
            if ('status' in error && 'error' in error) {
              const apiError = error as any;
              is401Error = apiError.status === 401;
              if (apiError.error?.error?.message) {
                errorMessage = `API Error (${apiError.status}): ${apiError.error.error.message}`;
                if (apiError.error.error.code) {
                  errorMessage += ` (Code: ${apiError.error.error.code})`;
                }
              } else {
                errorMessage = `API Error (${apiError.status}): ${error.message}`;
              }
            } else {
              errorMessage = `Error: ${error.message}`;
            }
          } else {
            errorMessage = `Error: ${String(error)}`;
          }
          
          // For 401 errors (invalid API key), don't retry - terminate immediately
          if (is401Error) {
            throw new Error(`${errorMessage}. Please check your API key and use /login to set a valid key.`);
          }
          
          // Ask user if they want to retry via callback
          if (this.onError) {
            const shouldRetry = await this.onError(errorMessage);
            if (shouldRetry) {
              // User wants to retry - continue the loop without adding error to conversation
              iteration++;
              continue;
            } else {
              // User chose not to retry - add error message and return
              this.messages.push({
                role: 'system',
                content: `Request failed with error: ${errorMessage}. User chose not to retry.`
              });
              return;
            }
          } else {
            // No error callback available - use old behavior
            // Add error context to conversation for model to see and potentially recover
            this.messages.push({
              role: 'system',
              content: `Previous API request failed with error: ${errorMessage}. Please try a different approach or ask the user for clarification.`
            });
            
            // Continue conversation loop to let model attempt recovery
            iteration++;
            continue;
          }
        }
      }

      // Hit max iterations, ask user if they want to continue
      if (iteration >= maxIterations) {
        let shouldContinue = false;
        if (this.onMaxIterations) {
          shouldContinue = await this.onMaxIterations(maxIterations);
        }
        if (shouldContinue) {
          iteration = 0; // Reset iteration counter
          continue; // Continue the outer loop
        } else {
          return; // Exit both loops
        }
      }
    }
  }

  private async executeToolCall(toolCall: any): Promise<Record<string, any>> {
    try {
      // Strip 'repo_browser.' prefix if present (some models hallucinate this)
      let toolName = toolCall.function.name;
      if (toolName.startsWith('repo_browser.')) {
        toolName = toolName.substring('repo_browser.'.length);
      }

      // Handle truncated tool calls
      let toolArgs: any;
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        return {
          error: `Tool arguments truncated: ${error}. Please break this into smaller pieces or use shorter content.`,
          success: false
        };
      }

      // Notify UI about tool start
      if (this.onToolStart) {
        this.onToolStart(toolName, toolArgs);
      }

      // Check read-before-edit for edit tools
      if (toolName === 'edit_file' && toolArgs.file_path) {
        if (!validateReadBeforeEdit(toolArgs.file_path)) {
          const errorMessage = getReadBeforeEditError(toolArgs.file_path);
          const result = { error: errorMessage, success: false };
          if (this.onToolEnd) {
            this.onToolEnd(toolName, result);
          }
          return result;
        }
      }

      // Check if tool needs approval (only after validation passes)
      const isDangerous = DANGEROUS_TOOLS.includes(toolName);
      const requiresApproval = APPROVAL_REQUIRED_TOOLS.includes(toolName);
      const needsApproval = isDangerous || requiresApproval;
      
      // For APPROVAL_REQUIRED_TOOLS, check if session auto-approval is enabled
      const canAutoApprove = requiresApproval && !isDangerous && this.sessionAutoApprove;
            
      if (needsApproval && !canAutoApprove) {
        let approvalResult: { approved: boolean; autoApproveSession?: boolean };
        
        if (this.onToolApproval) {
          // Check for interruption before waiting for approval
          if (this.isInterrupted) {
            const result = { error: 'Tool execution interrupted by user', success: false, userRejected: true };
            if (this.onToolEnd) {
              this.onToolEnd(toolName, result);
            }
            return result;
          }
          
          approvalResult = await this.onToolApproval(toolName, toolArgs);
          
          // Check for interruption after approval process
          if (this.isInterrupted) {
            const result = { error: 'Tool execution interrupted by user', success: false, userRejected: true };
            if (this.onToolEnd) {
              this.onToolEnd(toolName, result);
            }
            return result;
          }
        } else {
          // No approval callback available, reject by default
          approvalResult = { approved: false };
        }
        
        // Enable session auto-approval if requested (only for APPROVAL_REQUIRED_TOOLS)
        if (approvalResult.autoApproveSession && requiresApproval && !isDangerous) {
          this.sessionAutoApprove = true;
        }
        
        if (!approvalResult.approved) {
          const result = { error: 'Tool execution canceled by user', success: false, userRejected: true };
          if (this.onToolEnd) {
            this.onToolEnd(toolName, result);
          }
          return result;
        }
      }
    
      // Execute tool
      const result = await executeTool(toolName, toolArgs);

      // Notify UI about tool completion
      if (this.onToolEnd) {
        this.onToolEnd(toolName, result);
      }

      return result;

    } catch (error) {
      const errorMsg = `Tool execution error: ${error}`;
      return { error: errorMsg, success: false };
    }
  }
}


// Debug logging to file
const DEBUG_LOG_FILE = path.join(process.cwd(), 'debug-agent.log');
let debugLogCleared = false;
let debugEnabled = false;

function debugLog(message: string, data?: any) {
  if (!debugEnabled) return;
  
  // Clear log file on first debug log of each session
  if (!debugLogCleared) {
    fs.writeFileSync(DEBUG_LOG_FILE, '');
    debugLogCleared = true;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(DEBUG_LOG_FILE, logEntry);
}

function generateCurlCommand(apiKey: string, requestBody: any, requestCount: number): string {
  if (!debugEnabled) return '';
  
  const maskedApiKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`;
  
  // Write request body to JSON file
  const jsonFileName = `debug-request-${requestCount}.json`;
  const jsonFilePath = path.join(process.cwd(), jsonFileName);
  fs.writeFileSync(jsonFilePath, JSON.stringify(requestBody, null, 2));
  
  const curlCmd = `curl -X POST "https://api.together.xyz/v1/chat/completions" \\
  -H "Authorization: Bearer ${maskedApiKey}" \\
  -H "Content-Type: application/json" \\
  -d @${jsonFileName}`;
  
  return curlCmd;
}
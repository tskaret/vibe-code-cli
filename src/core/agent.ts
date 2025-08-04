import Groq from 'groq-sdk';
import { executeTool } from '../tools/builtin/tools.js';
import { validateReadBeforeEdit, getReadBeforeEditError } from '../tools/validators.js';
import { ALL_TOOLS, DANGEROUS_TOOLS, APPROVAL_REQUIRED_TOOLS } from '../tools/builtin/tool-schemas.js';
import { ConfigManager } from '../utils/local-settings.js';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export class Agent {
  private client: Groq | null = null;
  private messages: Message[] = [];
  private apiKey: string | null = null;
  private model: string;
  private temperature: number;
  private sessionAutoApprove: boolean = false;
  private systemMessage: string;
  private configManager: ConfigManager;
  private onToolStart?: (name: string, args: Record<string, any>) => void;
  private onToolEnd?: (name: string, result: any) => void;
  private onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
  private onThinkingText?: (content: string) => void;
  private onFinalMessage?: (content: string) => void;
  private onMaxIterations?: (maxIterations: number) => Promise<boolean>;

  private constructor(
    model: string,
    temperature: number,
    systemMessage: string | null
  ) {
    this.model = model;
    this.temperature = temperature;
    this.configManager = new ConfigManager();

    // Build system message
    if (systemMessage) {
      this.systemMessage = systemMessage;
    } else {
      this.systemMessage = this.buildDefaultSystemMessage();
    }

    // Add system message to conversation
    this.messages.push({ role: 'system', content: this.systemMessage });
  }

  static async create(
    model: string,
    temperature: number,
    systemMessage: string | null
  ): Promise<Agent> {
    // Check for default model in config if model not explicitly provided
    const configManager = new ConfigManager();
    const defaultModel = configManager.getDefaultModel();
    const selectedModel = defaultModel || model;
    
    const agent = new Agent(
      selectedModel,
      temperature,
      systemMessage
    );


    return agent;
  }

  private buildDefaultSystemMessage(): string {
    return `You are a coding assistant powered by ${this.model} on Groq. You have access to file system tools.

Use tools to:
- Read and understand files
- Create, edit, and manage files  
- Execute commands
- Search for information

IMPORTANT: When creating files, keep them focused and reasonably sized. For large applications:
1. Start with a simple, minimal version first
2. Create separate files for different components
3. Build incrementally rather than generating massive files at once

Be direct and efficient. Ask for approval before making destructive changes.

When asked about your identity, you should identify yourself as a coding assistant running on the ${this.model} model via Groq.`;
  }


  public setToolCallbacks(callbacks: {
    onToolStart?: (name: string, args: Record<string, any>) => void;
    onToolEnd?: (name: string, result: any) => void;
    onToolApproval?: (toolName: string, toolArgs: Record<string, any>) => Promise<{ approved: boolean; autoApproveSession?: boolean }>;
    onThinkingText?: (content: string) => void;
    onFinalMessage?: (content: string) => void;
    onMaxIterations?: (maxIterations: number) => Promise<boolean>;
  }) {
    this.onToolStart = callbacks.onToolStart;
    this.onToolEnd = callbacks.onToolEnd;
    this.onToolApproval = callbacks.onToolApproval;
    this.onThinkingText = callbacks.onThinkingText;
    this.onFinalMessage = callbacks.onFinalMessage;
    this.onMaxIterations = callbacks.onMaxIterations;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new Groq({ apiKey });
  }

  public saveApiKey(apiKey: string): void {
    this.configManager.setApiKey(apiKey);
    this.setApiKey(apiKey);
  }

  public clearApiKey(): void {
    this.configManager.clearApiKey();
    this.apiKey = null;
    this.client = null;
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

  async chat(userInput: string): Promise<void> {
    // Check API key on first message send
    if (!this.client) {
      // Try environment variable first
      const envApiKey = process.env.GROQ_API_KEY;
      if (envApiKey) {
        this.setApiKey(envApiKey);
      } else {
        // Try config file
        const configApiKey = this.configManager.getApiKey();
        if (configApiKey) {
          this.setApiKey(configApiKey);
        } else {
          throw new Error('No API key available. Please use /login to set your Groq API key.');
        }
      }
    }

    // Add user message
    this.messages.push({ role: 'user', content: userInput });

    const maxIterations = 50;
    let iteration = 0;

    while (true) { // Outer loop for iteration reset
      while (iteration < maxIterations) {
        try {
          // Check client exists
          if (!this.client) {
            throw new Error('Groq client not initialized');
          }
          
          // Use non-streaming API call for tool execution phases
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: this.messages as any,
            tools: ALL_TOOLS,
            tool_choice: 'auto',
            temperature: this.temperature,
            max_tokens: 8000,
            stream: false
          });

          const message = response.choices[0].message;

          // Handle tool calls if present
          if (message.tool_calls) {
            // Show thinking text if present
            if (message.content) {
              if (this.onThinkingText) {
                this.onThinkingText(message.content);
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
          
          if (this.onFinalMessage) {
            this.onFinalMessage(content);
          }

          // Add final response to conversation history
          this.messages.push({
            role: 'assistant',
            content: content
          });

          return; // Successfully completed, exit both loops

        } catch (error) {
          // Error handling is done by TUI
          return; // Error occurred, exit both loops
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
      const toolName = toolCall.function.name;

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
          approvalResult = await this.onToolApproval(toolName, toolArgs);
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
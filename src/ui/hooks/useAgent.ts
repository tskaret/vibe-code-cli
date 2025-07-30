import { useState, useCallback } from 'react';
import { Agent } from '../../core/agent.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'tool_execution';
  content: string;
  timestamp: Date;
  toolExecution?: ToolExecution;
}

export interface ToolExecution {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  needsApproval?: boolean;
  showDiff?: boolean;
}

export function useAgent(
  agent: Agent, 
  onStartRequest?: () => void,
  onAddTokens?: (content: string) => void, 
  onPauseRequest?: () => void,
  onResumeRequest?: () => void,
  onCompleteRequest?: () => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentToolExecution, setCurrentToolExecution] = useState<ToolExecution | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    toolName: string;
    toolArgs: Record<string, any>;
    resolve: (approved: boolean) => void;
  } | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  const sendMessage = useCallback(async (userInput: string) => {
    if (isProcessing) return;

    // Start tracking metrics for new agent request
    if (onStartRequest) {
      onStartRequest();
    }

    // Add user message and count its tokens
    addMessage({
      role: 'user',
      content: userInput,
    });
    
    // Count tokens from user input
    if (onAddTokens) {
      onAddTokens(userInput);
    }

    setIsProcessing(true);

    try {

      // Set up tool execution callbacks
      agent.setToolCallbacks({
        onThinkingText: (content: string) => {
          // Add thinking text as assistant message when model uses tools
          addMessage({
            role: 'assistant',
            content: content,
          });
          
          // Count tokens from thinking text
          if (onAddTokens) {
            onAddTokens(content);
          }
        },
        onFinalMessage: (content: string) => {
          // Add final assistant message when no tools are used
          addMessage({
            role: 'assistant',
            content: content,
          });
          
          // Count tokens from final message
          if (onAddTokens) {
            onAddTokens(content);
          }
        },
        onToolStart: (name: string, args: Record<string, any>) => {
          const toolExecution: ToolExecution = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            args,
            status: 'pending',
            needsApproval: ['create_file', 'edit_file', 'delete_file'].includes(name),
          };
          
          // Count tokens from tool arguments
          if (onAddTokens) {
            const argsText = JSON.stringify(args);
            onAddTokens(argsText);
          }
          
          // Only add message for tools that don't require approval
          // Approval tools will be added after approval
          if (!toolExecution.needsApproval) {
            toolExecution.showDiff = name === 'create_file' || name === 'edit_file';
            addMessage({
              role: 'tool_execution',
              content: `Executing ${name}...`,
              toolExecution,
            });
          }
          
          setCurrentToolExecution(toolExecution);
        },
        onToolEnd: (name: string, result: any) => {
          // Count tokens from tool result
          if (onAddTokens && result) {
            const resultText = typeof result === 'string' ? result : JSON.stringify(result);
            onAddTokens(resultText);
          }
          
          setMessages(prev => prev.map(msg => 
            msg.toolExecution?.name === name && msg.role === 'tool_execution'
              ? { 
                  ...msg, 
                  content: result.userRejected 
                    ? `🚫 ${name} rejected by user`
                    : result.success 
                      ? `✅ ${name} completed successfully` 
                      : `❌ ${name} failed: ${result.error || 'Unknown error'}`,
                  toolExecution: { 
                    ...msg.toolExecution!, 
                    status: result.userRejected 
                      ? 'cancelled'
                      : result.success 
                        ? 'completed' 
                        : 'failed',
                    result 
                  }
                }
              : msg
          ));
          setCurrentToolExecution(null);
        },
        onToolApproval: async (toolName: string, toolArgs: Record<string, any>) => {
          // Pause metrics while waiting for approval
          if (onPauseRequest) {
            onPauseRequest();
          }
          
          return new Promise<boolean>((resolve) => {
            setPendingApproval({ 
              toolName, 
              toolArgs, 
              resolve: (approved: boolean) => {
                // Resume metrics after approval decision
                if (onResumeRequest) {
                  onResumeRequest();
                }
                
                // Always add the tool execution message (approved or rejected)
                const toolExecution: ToolExecution = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: toolName,
                  args: toolArgs,
                  status: approved ? 'approved' : 'cancelled',
                  needsApproval: true,
                  showDiff: toolName === 'create_file' || toolName === 'edit_file',
                };
                
                addMessage({
                  role: 'tool_execution',
                  content: approved ? `Executing ${toolName}...` : `Tool ${toolName} rejected by user`,
                  toolExecution,
                });
                
                resolve(approved);
              }
            });
          });
        },
      });

      await agent.chat(userInput);

    } catch (error) {
      addMessage({
        role: 'system',
        content: `Error: ${error}`,
      });
    } finally {
      setIsProcessing(false);
      setCurrentToolExecution(null);
      
      // Complete the request tracking
      if (onCompleteRequest) {
        onCompleteRequest();
      }
    }
  }, [agent, isProcessing, addMessage, updateMessage, onStartRequest, onAddTokens, onPauseRequest, onResumeRequest, onCompleteRequest]);

  const approveToolExecution = useCallback((approved: boolean) => {
    if (pendingApproval) {
      pendingApproval.resolve(approved);
      setPendingApproval(null);
    }
  }, [pendingApproval]);

  const setApiKey = useCallback((apiKey: string) => {
    agent.setApiKey(apiKey);
  }, [agent]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    agent.clearHistory();
  }, [agent]);

  return {
    messages,
    isProcessing,
    currentToolExecution,
    pendingApproval,
    sendMessage,
    approveToolExecution,
    addMessage,
    setApiKey,
    clearHistory,
  };
}
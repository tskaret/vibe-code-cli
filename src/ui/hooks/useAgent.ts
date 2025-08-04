import { useState, useCallback, useRef } from 'react';
import { Agent } from '../../core/agent.js';
import { DANGEROUS_TOOLS, APPROVAL_REQUIRED_TOOLS } from '../../tools/builtin/tool-schemas.js';

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
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'canceled';
  result?: any;
  needsApproval?: boolean;
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
  const [userMessageHistory, setUserMessageHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentToolExecution, setCurrentToolExecution] = useState<ToolExecution | null>(null);
  const [sessionAutoApprove, setSessionAutoApprove] = useState(false);
  const currentExecutionIdRef = useRef<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    toolName: string;
    toolArgs: Record<string, any>;
    resolve: (approvalResult: { approved: boolean; autoApproveSession?: boolean }) => void;
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

    // Add user message to history
    setUserMessageHistory(prev => [...prev, userInput]);

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
            needsApproval: DANGEROUS_TOOLS.includes(name) || APPROVAL_REQUIRED_TOOLS.includes(name),
          };
          
          // Store the ID in ref for reliable matching across callbacks
          currentExecutionIdRef.current = toolExecution.id;
          
          // Count tokens from tool arguments
          if (onAddTokens) {
            const argsText = JSON.stringify(args);
            onAddTokens(argsText);
          }
          
          // Always add tool execution message - approval is handled separately
          addMessage({
            role: 'tool_execution',
            content: `Executing ${name}...`,
            toolExecution,
          });
          
          setCurrentToolExecution(toolExecution);
        },
        onToolEnd: (name: string, result: any) => {
          const executionId = currentExecutionIdRef.current;
          
          // Count tokens from tool result
          if (onAddTokens && result) {
            const resultText = typeof result === 'string' ? result : JSON.stringify(result);
            onAddTokens(resultText);
          }
          
          // Only update the specific tool execution that just finished
          setMessages(prev => {
            return prev.map(msg => {
              // Match by the execution ID stored in ref (reliable across callbacks)
              if (msg.toolExecution?.id === executionId && msg.role === 'tool_execution') {
                return { 
                ...msg, 
                content: result.userRejected 
                  ? `🚫 ${name} rejected by user`
                  : result.success 
                    ? `✓ ${name} completed successfully` 
                    : `🔴 ${name} failed: ${result.error || 'Unknown error'}`,
                toolExecution: { 
                  ...msg.toolExecution!, 
                  status: result.userRejected 
                    ? 'canceled'
                    : result.success 
                      ? 'completed' 
                      : 'failed',
                  result 
                }
              };
            }
            return msg;
          });
        });
          setCurrentToolExecution(null);
          currentExecutionIdRef.current = null;
        },
        onToolApproval: async (toolName: string, toolArgs: Record<string, any>) => {          
          // Pause metrics while waiting for approval
          if (onPauseRequest) {
            onPauseRequest();
          }
          
          return new Promise<{ approved: boolean; autoApproveSession?: boolean }>((resolve) => {
            setPendingApproval({ 
              toolName, 
              toolArgs, 
              resolve: (approvalResult: { approved: boolean; autoApproveSession?: boolean }) => {
                
                // Resume metrics after approval decision
                if (onResumeRequest) {
                  onResumeRequest();
                }
                
                // Update the existing tool execution message with approval result
                setMessages(prev => {
                  return prev.map(msg => {
                    if (msg.toolExecution?.id === currentExecutionIdRef.current && msg.role === 'tool_execution') {
                      const messageContent = approvalResult.approved 
                        ? `Executing ${toolName}...${approvalResult.autoApproveSession ? ' (Auto-approval enabled for session)' : ''}` 
                        : `Tool ${toolName} rejected by user`;
                      
                      return { 
                        ...msg, 
                        content: messageContent,
                        toolExecution: { 
                          ...msg.toolExecution!, 
                          status: approvalResult.approved ? 'approved' : 'canceled'
                        }
                      };
                    }
                    return msg;
                  });
                });
                
                if (approvalResult.autoApproveSession) {
                  setSessionAutoApprove(true);
                }
                resolve(approvalResult);
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

  const approveToolExecution = useCallback((approved: boolean, autoApproveSession?: boolean) => {
    if (pendingApproval) {
      pendingApproval.resolve({ approved, autoApproveSession });
      setPendingApproval(null);
    }
  }, [pendingApproval]);

  const setApiKey = useCallback((apiKey: string) => {
    agent.setApiKey(apiKey);
  }, [agent]);

  const toggleAutoApprove = useCallback(() => {
    const newAutoApproveState = !sessionAutoApprove;
    setSessionAutoApprove(newAutoApproveState);
    agent.setSessionAutoApprove(newAutoApproveState);
  }, [sessionAutoApprove, agent]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setUserMessageHistory([]);
    // Don't reset sessionAutoApprove - it should persist across /clear
    agent.clearHistory();
  }, [agent]);

  return {
    messages,
    userMessageHistory,
    isProcessing,
    currentToolExecution,
    pendingApproval,
    sessionAutoApprove,
    sendMessage,
    approveToolExecution,
    addMessage,
    setApiKey,
    clearHistory,
    toggleAutoApprove,
  };
}
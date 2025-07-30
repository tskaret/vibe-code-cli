import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Agent } from '../../../core/agent.js';
import { useAgent } from '../../hooks/useAgent.js';
import { useTokenMetrics } from '../../hooks/useTokenMetrics.js';
import MessageList from './MessageList.js';
import MessageInput from './MessageInput.js';
import DiffPreview from '../display/DiffPreview.js';
import TokenMetrics from '../display/TokenMetrics.js';
import Login from '../modals/Login.js';
import ModelSelector from '../modals/ModelSelector.js';
import { handleSlashCommand } from '../../../commands/index.js';

interface ChatProps {
  agent: Agent;
}

export default function Chat({ agent }: ChatProps) {
  const {
    tokenCount,
    startTime,
    endTime,
    pausedTime,
    isPaused,
    isActive,
    startRequest,
    addTokens,
    pauseMetrics,
    resumeMetrics,
    completeRequest,
    resetMetrics,
  } = useTokenMetrics();

  const agentHook = useAgent(
    agent, 
    startRequest,      // Start tracking on new request
    addTokens,         // Add tokens throughout the request
    pauseMetrics,      // Pause during approval
    resumeMetrics,     // Resume after approval
    completeRequest    // Complete when agent is done
  );

  const {
    messages,
    isProcessing,
    currentToolExecution,
    pendingApproval,
    sendMessage,
    approveToolExecution,
    addMessage,
    setApiKey,
    clearHistory,
  } = agentHook;

  const { exit } = useApp();
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Handle global keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
    
    // Handle tool approval
    if (pendingApproval) {
      if (input === 'y' || input === 'Y') {
        handleApproval(true);
      } else if (input === 'n' || input === 'N') {
        handleApproval(false);
      }
    }
  });

  // Hide input when processing, waiting for approval, or showing login/model selector
  useEffect(() => {
    setShowInput(!isProcessing && !pendingApproval && !showLogin && !showModelSelector);
  }, [isProcessing, pendingApproval, showLogin, showModelSelector]);

  const handleSendMessage = async (message: string) => {
    if (message.trim() && !isProcessing) {
      setInputValue('');
      
      // Handle exit commands
      if (['exit', 'quit', 'bye'].includes(message.toLowerCase())) {
        exit();
        return;
      }
      
      // Handle slash commands
      if (message.startsWith('/')) {
        handleSlashCommand(message, {
          addMessage,
          clearHistory,
          setShowLogin,
          setShowModelSelector,
        });
        return;
      }
      
      // The agent will handle starting request tracking
      await sendMessage(message);
    }
  };

  const handleApproval = (approved: boolean) => {
    approveToolExecution(approved);
  };

  const handleLogin = (apiKey: string) => {
    setShowLogin(false);
    // Save the API key persistently
    agent.saveApiKey(apiKey);
    addMessage({
      role: 'system',
      content: 'API key saved successfully. You can now start chatting with the assistant.',
    });
  };

  const handleLoginCancel = () => {
    setShowLogin(false);
    addMessage({
      role: 'system',
      content: 'Login cancelled.',
    });
  };

  const handleModelSelect = (model: string) => {
    setShowModelSelector(false);
    // Clear chat history when switching models
    clearHistory();
    // Set the new model on the agent
    agent.setModel(model);
    addMessage({
      role: 'system',
      content: `Switched to model: ${model}. Chat history has been cleared.`,
    });
  };

  const handleModelCancel = () => {
    setShowModelSelector(false);
    addMessage({
      role: 'system',
      content: 'Model selection cancelled.',
    });
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Chat messages area */}
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        <MessageList messages={messages} />
      </Box>

      {/* Token metrics */}
      <TokenMetrics
        isActive={isActive}
        isPaused={isPaused}
        startTime={startTime}
        endTime={endTime}
        pausedTime={pausedTime}
        tokenCount={tokenCount}
      />

      {/* Input area */}
      <Box borderStyle="round" borderColor="white" paddingX={1}>
        {pendingApproval ? (
          <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
            {/* Tool name header */}
            <Box marginBottom={1}>
              <Text color="yellow">
                ⚠️ Tool: <Text bold>{pendingApproval.toolName}</Text>
              </Text>
            </Box>
            
            {/* Show key parameters */}
            {(() => {
              const formatKeyParams = (toolName: string, args: Record<string, any>) => {
                const paramMappings: Record<string, string[]> = {
                  read_file: ['file_path'],
                  create_file: ['path'],
                  edit_file: ['file_path', 'start_line', 'end_line'],
                  delete_file: ['path'],
                  move_file: ['source_path', 'destination_path'],
                  search_files: ['pattern', 'directory'],
                  list_files: ['directory'],
                  get_context: ['directory'],
                  create_tasks: [],
                  update_tasks: [],
                  execute_command: ['command'],
                  lint_code: ['file_path']
                };

                const keyParams = paramMappings[toolName] || [];

                if (keyParams.length === 0) {
                  return '';
                }

                const paramParts = keyParams
                  .filter(param => param in args)
                  .map(param => {
                    let value = args[param];
                    // Truncate long values
                    if (typeof value === 'string' && value.length > 50) {
                      value = value.substring(0, 47) + '...';
                    } else if (Array.isArray(value) && value.length > 3) {
                      value = `[${value.length} items]`;
                    }
                    return `${param}: ${JSON.stringify(value)}`;
                  });

                return paramParts.join(', ');
              };
              
              const keyParams = formatKeyParams(pendingApproval.toolName, pendingApproval.toolArgs);
              return keyParams ? (
                <Box marginBottom={1}>
                  <Text color="gray" dimColor>
                    {keyParams}
                  </Text>
                </Box>
              ) : null;
            })()} 
            
            {/* Show diff for file operations */}
            {(pendingApproval.toolName === 'create_file' || pendingApproval.toolName === 'edit_file') && (
              <Box marginBottom={1}>
                <DiffPreview 
                  toolName={pendingApproval.toolName}
                  toolArgs={pendingApproval.toolArgs}
                />
              </Box>
            )}
            
            {/* Approval prompt */}
            <Text color="yellow">
              ⚠️ This tool requires approval. Press 'y' to approve or 'n' to reject.
            </Text>
          </Box>
        ) : showLogin ? (
          <Login
            onSubmit={handleLogin}
            onCancel={handleLoginCancel}
          />
        ) : showModelSelector ? (
          <ModelSelector
            onSubmit={handleModelSelect}
            onCancel={handleModelCancel}
            currentModel={agent.getCurrentModel?.() || undefined}
          />
        ) : showInput ? (
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            placeholder="Type your message... (Ctrl+C to exit)"
          />
        ) : (
          <Box>
            <Text color="gray" dimColor>Processing...</Text>
          </Box>
        )}
      </Box>

      <Box justifyContent="flex-end" paddingRight={1}>
        <Text color="gray" dimColor>
          {agent.getCurrentModel?.() || ''}
        </Text>
      </Box>
    </Box>
  );
}
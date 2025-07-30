import React from 'react';
import { Box, Text, useInput } from 'ink';
import { ToolExecution } from '../../hooks/useAgent.js';
import DiffPreview from './DiffPreview.js';

interface ToolCallProps {
  execution: ToolExecution;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function ToolCall({ execution, onApprove, onReject }: ToolCallProps) {
  const { name, args, status, result, needsApproval, showDiff } = execution;

  // Handle approval input
  useInput((input, key) => {
    if (needsApproval && status === 'pending') {
      if (input === 'y' || input === 'Y') {
        onApprove?.();
      } else if (input === 'n' || input === 'N') {
        onReject?.();
      }
    }
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return needsApproval ? '⚠️' : '⏳';
      case 'approved':
        return '✅';
      case 'executing':
        return '🔧';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🚫';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return needsApproval ? 'yellow' : 'blue';
      case 'approved':
        return 'green';
      case 'executing':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'cancelled':
        return 'gray';
      default:
        return 'white';
    }
  };

  const formatKeyParams = (toolName: string, args: Record<string, any>) => {
    const paramMappings: Record<string, string[]> = {
      read_file: ['file_path'],
      create_file: ['path'],
      edit_file: ['file_path', 'old_text', 'new_text'],
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

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={getStatusColor()} paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text color={getStatusColor()}>
          {getStatusIcon()} Tool: <Text bold>{name}</Text>
        </Text>
      </Box>
      
      {/* Show task list for task tools */}
      {(name === 'create_tasks' || name === 'update_tasks') && result?.content?.tasks ? (
        <Box marginBottom={1} flexDirection="column">
          {result.content.tasks.map((task: any, index: number) => {
            const statusSymbol = task.status === 'pending' ? '☐' : (task.status === 'in_progress' ? '🔄' : '✅');
            const isCompleted = task.status === 'completed';
            return (
              <Text key={task.id || index} color={isCompleted ? 'green' : 'white'}>
                {statusSymbol} {task.description}
              </Text>
            );
          })}
        </Box>
      ) : formatKeyParams(name, args) ? (
        <Box marginBottom={1}>
          <Text color="gray">
            {formatKeyParams(name, args)}
          </Text>
        </Box>
      ) : null}

      {showDiff && (status === 'completed' || status === 'approved' || status === 'executing') && (
        <Box marginBottom={1}>
          <DiffPreview 
            toolName={name}
            toolArgs={args}
          />
        </Box>
      )}

      {status === 'pending' && needsApproval && (
        <Box marginBottom={1}>
          <Text color="yellow">
            ⚠️ This tool requires approval. Press 'y' to approve or 'n' to reject.
          </Text>
        </Box>
      )}

      {status === 'executing' && (
        <Box marginBottom={1}>
          <Text color="blue">
            🔧 Executing tool...
          </Text>
        </Box>
      )}

      {status === 'completed' && result && (
        <Box marginBottom={1}>
          {result.success ? (
            <Box flexDirection="column">
              {result.content && !(name === 'create_tasks' || name === 'update_tasks') && (
                <Box flexDirection="column">
                  {(() => {
                    const content = result.content;
                    
                    // Handle execute_command output format
                    if (typeof content === 'string' && content.includes('stdout:') && content.includes('stderr:')) {
                      const lines = content.split('\n');
                      let stdoutLines: string[] = [];
                      let stderrLines: string[] = [];
                      let currentSection = '';
                      
                      for (const line of lines) {
                        if (line.startsWith('stdout:')) {
                          currentSection = 'stdout';
                          const stdoutContent = line.substring(7).trim();
                          if (stdoutContent) stdoutLines.push(stdoutContent);
                        } else if (line.startsWith('stderr:')) {
                          currentSection = 'stderr';
                          const stderrContent = line.substring(7).trim();
                          if (stderrContent) stderrLines.push(stderrContent);
                        } else if (currentSection === 'stdout') {
                          stdoutLines.push(line);
                        } else if (currentSection === 'stderr') {
                          stderrLines.push(line);
                        }
                      }
                      
                      return (
                        <>
                          {stdoutLines.length > 0 && stdoutLines.some(line => line.trim()) && (
                            <Text color="white">{stdoutLines.join('\n')}</Text>
                          )}
                          {stderrLines.length > 0 && stderrLines.some(line => line.trim()) && (
                            <Text color="yellow">{stderrLines.join('\n')}</Text>
                          )}
                        </>
                      );
                    }
                    
                    // Handle directory tree output for list_files
                    if (name === 'list_files') {
                      return (
                        <Text color="cyan">
                          {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
                        </Text>
                      );
                    }
                    
                    // Handle file content for read_file - don't show content
                    if (name === 'read_file') {
                      return null;
                    }
                    
                    // Default handling
                    return (
                      <Text color="white">
                        {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
                      </Text>
                    );
                  })()} 
                </Box>
              )}
              {result.message && !result.content && !(name === 'create_tasks' || name === 'update_tasks') && (
                <Text color="gray">
                  {result.message}
                </Text>
              )}
            </Box>
          ) : (
            <Text color="red">
              ❌ Tool failed: {result.error || 'Unknown error'}
            </Text>
          )}
        </Box>
      )}

      {status === 'failed' && (
        <Box marginBottom={1}>
          <Text color="red">
            ❌ Tool execution failed
            {result?.error && (
              <Text color="gray">
                {' '}({result.error})
              </Text>
            )}
          </Text>
        </Box>
      )}

      {status === 'cancelled' && (
        <Box marginBottom={1}>
          <Text color="gray">
            🚫 Tool execution cancelled by user
          </Text>
        </Box>
      )}
    </Box>
  );
}
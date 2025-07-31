import React from 'react';
import { Box, Text } from 'ink';
import { ToolExecution } from '../../hooks/useAgent.js';
import DiffPreview from './DiffPreview.js';

interface ToolHistoryItemProps {
  execution: ToolExecution;
}

export default function ToolHistoryItem({ execution }: ToolHistoryItemProps) {
  const { name, args, status, result } = execution;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '🟢';
      case 'failed':
        return '🔴';
      case 'canceled':
        return '🚫';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'canceled':
        return 'gray';
      default:
        return 'white';
    }
  };


  const shouldShowDiff = (toolName: string) => {
    return ['create_file', 'edit_file'].includes(toolName);
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

  const renderResult = (toolName: string, result: any) => {
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
    if (toolName === 'list_files') {
      return (
        <Text color="cyan">
          {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
        </Text>
      );
    }
    
    // Handle file content for read_file - don't show content
    if (toolName === 'read_file') {
      return null;
    }
    
    // Default handling
    return (
      <Text color="white">
        {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
      </Text>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={getStatusColor()} paddingX={1}>
      <Box>
        <Text color={getStatusColor()}>
          {getStatusIcon()} <Text bold>{name}</Text>
        </Text>
      </Box>
      
      {(name === 'create_tasks' || name === 'update_tasks') && result?.content?.tasks ? (
        <Box flexDirection="column">
          {result.content.tasks.map((task: any, index: number) => {
            const statusSymbol = task.status === 'pending' ? '☐' : (task.status === 'in_progress' ? '🔄' : '✓');
            const isCompleted = task.status === 'completed';
            return (
              <Text key={task.id || index} color={isCompleted ? 'green' : 'white'}>
                {statusSymbol} {task.description}
              </Text>
            );
          })}
        </Box>
      ) : formatKeyParams(name, args) ? (
        <Box>
          <Text color="gray">
            {formatKeyParams(name, args)}
          </Text>
        </Box>
      ) : null}

      {shouldShowDiff(name) && status === 'completed' && (
        <Box>
          <DiffPreview 
            toolName={name}
            toolArgs={args}
          />
        </Box>
      )}

      {status === 'completed' && result && (
        <Box>
          {result.success ? (
            <Box flexDirection="column">
              {result.content && !(name === 'create_tasks' || name === 'update_tasks') && (
                <Box flexDirection="column">
                  {renderResult(name, result)}
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
              Tool failed: {result.error || 'Unknown error'}
            </Text>
          )}
        </Box>
      )}

      {status === 'failed' && (
        <Box>
          <Text color="red">
            Tool execution failed
            {result?.error && (
              <Text color="gray">
                {' '}({result.error})
              </Text>
            )}
          </Text>
        </Box>
      )}

      {status === 'canceled' && (
        <Box>
          <Text color="gray">
            Tool execution canceled by user
          </Text>
        </Box>
      )}
    </Box>
  );
}
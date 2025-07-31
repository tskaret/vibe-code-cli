import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import DiffPreview from '../display/DiffPreview.js';

interface PendingToolApprovalProps {
  toolName: string;
  toolArgs: Record<string, any>;
  onApprove: () => void;
  onReject: () => void;
}

export default function PendingToolApproval({ 
  toolName, 
  toolArgs, 
  onApprove, 
  onReject 
}: PendingToolApprovalProps) {
  const [selectedApprovalOption, setSelectedApprovalOption] = useState(0);

  // Reset selection when component mounts
  useEffect(() => {
    setSelectedApprovalOption(0);
  }, [toolName, toolArgs]);

  // Handle approval input
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedApprovalOption(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedApprovalOption(prev => Math.min(1, prev + 1));
    } else if (key.return) {
      if (selectedApprovalOption === 0) {
        onApprove();
      } else {
        onReject();
      }
    }
  });

  const getFilename = () => {
    const filePath = toolArgs?.file_path || toolArgs?.source_path;
    if (!filePath) return null;
    return filePath.split('/').pop() || filePath;
  };

  const formatKeyParams = (toolName: string, args: Record<string, any>) => {
    const paramMappings: Record<string, string[]> = {
      read_file: ['file_path'],
      create_file: ['file_path'],
      edit_file: ['file_path', 'start_line', 'end_line'],
      delete_file: ['file_path'],
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

  const filename = getFilename();

  return (
    <Box flexDirection="column">
      {/* Tool name header */}
      <Box>
        <Text color="yellow">
          🟡 <Text bold>{toolName}</Text>
        </Text>
      </Box>
      
      {/* Show key parameters */}
      {(() => {
        const keyParams = formatKeyParams(toolName, toolArgs);
        return keyParams ? (
          <Box>
            <Text color="gray" dimColor>
              {keyParams}
            </Text>
          </Box>
        ) : null;
      })()} 
      
      {/* Show diff for file operations in yellow bordered box */}
      {(toolName === 'create_file' || toolName === 'edit_file') && (
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <DiffPreview 
            toolName={toolName}
            toolArgs={toolArgs}
          />
        </Box>
      )}
      
      {/* Approval options */}
      <Box flexDirection="column">
        <Text color="yellow">
          {filename 
            ? <>Approve this edit to <Text bold>{filename}</Text>?</>
            : 'Approve this tool call?'
          }
        </Text>
        
        <Box flexDirection="column">
          <Box>
            <Text color={selectedApprovalOption === 0 ? "black" : "green"}
                  backgroundColor={selectedApprovalOption === 0 ? "rgb(124, 214, 114)" : undefined}>
              {selectedApprovalOption === 0 ? <Text bold>{">"}</Text> : "  "} Yes
            </Text>
          </Box>
          <Box>
            <Text color={selectedApprovalOption === 1 ? "black" : "red"}
                  backgroundColor={selectedApprovalOption === 1 ? "rgb(214, 114, 114)" : undefined}>
              {selectedApprovalOption === 1 ? <Text bold>{">"}</Text> : "  "} No, tell Groq what to do differently (esc)
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
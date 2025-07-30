import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getCommandNames } from '../../../commands/index.js';
import SlashCommandSuggestions from './SlashCommandSuggestions.js';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
}

export default function MessageInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Type your message... (Ctrl+C to exit)" 
}: MessageInputProps) {
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  
  const isSlashCommand = value.startsWith('/');
  const showSlashCommands = isSlashCommand;

  useInput((input, key) => {
    if (key.return) {
      if (isSlashCommand) {
        // Auto-complete to selected command
        const searchTerm = value.slice(1).toLowerCase();
        const commands = getCommandNames();
        const filteredCommands = commands.filter(cmd => 
          cmd.toLowerCase().includes(searchTerm)
        );
        if (filteredCommands.length > 0) {
          onSubmit('/' + (filteredCommands[selectedCommandIndex] || filteredCommands[0]));
          return;
        }
      }
      onSubmit(value);
      return;
    }

    if (key.upArrow && showSlashCommands) {
      setSelectedCommandIndex(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow && showSlashCommands) {
      const searchTerm = value.slice(1).toLowerCase();
      const commands = getCommandNames();
      const filteredCommands = commands.filter(cmd => 
        cmd.toLowerCase().includes(searchTerm)
      );
      setSelectedCommandIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
      return;
    }

    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      setSelectedCommandIndex(0);
      return;
    }

    if (key.ctrl) {
      // Handle Ctrl+C in parent component
      return;
    }

    // Regular character input
    if (input && !key.meta && !key.ctrl) {
      onChange(value + input);
      setSelectedCommandIndex(0);
    }
  });

  const displayValue = value || placeholder;
  const isPlaceholder = !value;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>{'>'} </Text>
        <Box flexGrow={1}>
          <Text color={isPlaceholder ? "gray" : "gray"}>
            {displayValue}
            {!isPlaceholder && (
              <Text backgroundColor="cyan" color="cyan">▌</Text>
            )}
          </Text>
        </Box>
      </Box>
      {showSlashCommands && (
        <SlashCommandSuggestions 
          input={value} 
          selectedIndex={selectedCommandIndex}
          onSelect={(command: string) => onSubmit('/' + command)}
        />
      )}
    </Box>
  );
}
import React, { useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { ChatMessage } from '../../hooks/useAgent.js';
import ToolCall from '../display/ToolCall.js';

interface MessageListProps {
  messages: ChatMessage[];
}

export default function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToBottom?.();
    }
  }, [messages.length]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message: ChatMessage) => {
    const timestamp = formatTimestamp(message.timestamp);
    
    switch (message.role) {
      case 'user':
        return (
          <Box key={message.id} marginBottom={1}>
            <Text color="cyan" bold>{'>'} </Text>
            <Text color="gray">{message.content}</Text>
          </Box>
        );
        
      // TODO: Add symbol in front of each assistant message
      case 'assistant':
        return (
          <Box key={message.id} marginBottom={1}>
            <Text>{message.content}</Text>
          </Box>
        );
        
      case 'system':
        return (
          <Box key={message.id} marginBottom={1}>
            <Text color="yellow" italic>
              {message.content}
            </Text>
          </Box>
        );
        
      case 'tool_execution':
        if (message.toolExecution) {
          return (
            <Box key={message.id} marginBottom={1}>
              <ToolCall execution={message.toolExecution} />
            </Box>
          );
        }
        return (
          <Box key={message.id} marginBottom={1}>
            <Text color="blue">Tool: {message.content}</Text>
          </Box>
        );
        
      default:
        return (
          <Box key={message.id} marginBottom={1}>
            <Text color="gray" dimColor>
              Unknown: {message.content}
            </Text>
          </Box>
        );
    }
  };

  return (
    <Box ref={scrollRef} flexDirection="column" flexGrow={1}>
      {messages.length === 0 ? (
        <Box justifyContent="center" paddingY={2}>
          <Text color="gray" dimColor italic>
            Start typing to begin your conversation...
          </Text>
        </Box>
      ) : (
        messages.map(renderMessage)
      )}
    </Box>
  );
}
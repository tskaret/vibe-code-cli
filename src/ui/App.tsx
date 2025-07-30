import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Agent } from '../core/agent.js';
import Chat from './components/core/Chat.js';

interface AppProps {
  agent: Agent;
  initialPrompt?: string;
}

export default function App({ agent, initialPrompt }: AppProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      if (initialPrompt) {
        await agent.chat(initialPrompt);
      }
      setIsReady(true);
    };
    
    initialize();
  }, [agent, initialPrompt]);

  return (
    <Box flexDirection="column" height="100%">

      {isReady ? (
        <Chat agent={agent} />
      ) : (
        <Box justifyContent="center" alignItems="center" height="100%">
          <Text>Initializing agent...</Text>
        </Box>
      )}
    </Box>
  );
}
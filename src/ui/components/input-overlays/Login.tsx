import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface LoginProps {
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
}

export default function Login({ onSubmit, onCancel }: LoginProps) {
  const [apiKey, setApiKey] = useState('');

  useInput((input, key) => {
    if (key.return) {
      onSubmit('local-inference'); // Use placeholder for local inference
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>Vibe - Local AI Setup</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Vibe runs AI models locally via HuggingFace. Please ensure Python dependencies are installed:
          {'\n'}pip install -r requirements.txt
        </Text>
      </Box>

      <Box>
        <Text color="green">Press Enter to continue with local inference or Esc to cancel</Text>
      </Box>
    </Box>
  );
}
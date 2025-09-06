import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

interface ModelInfo {
  name: string;
  size_b?: number;
  vram_gb?: number;
  color: 'green' | 'yellow' | 'red' | 'white';
  available: boolean;
}

interface ModelSelectorProps {
  onSubmit: (model: string) => void;
  onCancel: () => void;
  currentModel?: string;
}

export default function ModelSelector({ onSubmit, onCancel, currentModel }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [availableVram, setAvailableVram] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      // Get the directory where this CLI is installed (not current working directory)
      const currentFile = fileURLToPath(import.meta.url);
      const cliDir = path.resolve(path.dirname(currentFile), '../../../..');
      const scriptPath = path.join(cliDir, 'list_models.py');
      const python = spawn('python3', [scriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            setModels(result.models || []);
            setAvailableVram(result.available_vram_gb || 0);
            
            // Set initial selection to current model if found
            const currentIndex = result.models.findIndex((model: ModelInfo) => model.name === currentModel);
            setSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
          } catch (e) {
            setError(`Failed to parse model list: ${e}`);
          }
        } else {
          setError(`Failed to load models: ${stderr}`);
        }
        setLoading(false);
      });
      
      python.on('error', (error) => {
        setError(`Failed to start model listing script: ${error.message}`);
        setLoading(false);
      });
      
    } catch (error) {
      setError(`Error loading models: ${error}`);
      setLoading(false);
    }
  };

  const handleModelSelect = () => {
    const selectedModel = models[selectedIndex];
    if (!selectedModel) return;

    // Check if model needs confirmation (yellow or red)
    if (selectedModel.color === 'yellow' || selectedModel.color === 'red') {
      setShowConfirmation(true);
    } else {
      onSubmit(selectedModel.name);
    }
  };

  const handleConfirmation = (confirmed: boolean) => {
    setShowConfirmation(false);
    if (confirmed) {
      onSubmit(models[selectedIndex].name);
    }
  };

  useInput((input, key) => {
    if (showConfirmation) {
      if (key.return || input === 'y' || input === 'Y') {
        handleConfirmation(true);
        return;
      }
      if (key.escape || input === 'n' || input === 'N') {
        handleConfirmation(false);
        return;
      }
      return;
    }

    if (key.return) {
      handleModelSelect();
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(models.length - 1, prev + 1));
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }
  });

  // Show confirmation dialog
  if (showConfirmation) {
    const selectedModel = models[selectedIndex];
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="yellow" bold>⚠️  Model Size Warning</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>
            Model: <Text bold color={selectedModel.color}>{selectedModel.name}</Text>
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>
            Estimated VRAM required: <Text bold color={selectedModel.color}>
              {selectedModel.vram_gb?.toFixed(1) || '?'} GB
            </Text>
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>
            Available VRAM: <Text bold>{availableVram.toFixed(1)} GB</Text>
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={selectedModel.color}>
            {selectedModel.color === 'yellow' 
              ? '⚠️  This model may use swap memory (slower performance)'
              : '❌ This model likely requires more VRAM than available'
            }
          </Text>
        </Box>
        
        <Box>
          <Text>
            Continue anyway? <Text bold color="green">Y</Text>es / <Text bold color="red">N</Text>o
          </Text>
        </Box>
      </Box>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>Loading Models...</Text>
        </Box>
        <Box>
          <Text color="gray">Scanning HuggingFace models and checking VRAM requirements...</Text>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="red" bold>Error Loading Models</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
        <Box>
          <Text color="gray">Press Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Show model list
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Select HuggingFace Model</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Available VRAM: <Text bold>{availableVram.toFixed(1)} GB</Text>
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          <Text color="green">●</Text> Fits in VRAM  <Text color="yellow">●</Text> May need swap  <Text color="red">●</Text> Too large
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {models.map((model, index) => (
          <Box key={model.name} marginBottom={0}>
            <Text 
              color={index === selectedIndex ? 'black' : 'white'}
              backgroundColor={index === selectedIndex ? 'cyan' : undefined}
              bold={index === selectedIndex}
            >
              {index === selectedIndex ? '>' : ' '} {' '}
              <Text color={model.color}>●</Text> {model.name.split('/').pop()}
              {model.name === currentModel ? ' (current)' : ''}
              {model.vram_gb && ` (${model.vram_gb.toFixed(1)}GB)`}
            </Text>
            {index === selectedIndex && model.size_b && (
              <Box marginLeft={4}>
                <Text color="gray" dimColor>
                  {model.size_b.toFixed(1)}B parameters • {model.available ? 'Available' : 'May require download'}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
      
      <Box>
        <Text color="gray" dimColor>
          Use ↑↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}
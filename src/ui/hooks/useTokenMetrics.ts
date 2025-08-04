import { useState, useCallback, useRef } from 'react';

interface TokenMetricsState {
  tokenCount: number;
  startTime: Date | null;
  endTime: Date | null;
  pausedTime: number; // Total time spent paused (in milliseconds)
  isPaused: boolean;
  isActive: boolean; // True when agent is processing (includes paused time)
}

export function useTokenMetrics() {
  const [metrics, setMetrics] = useState<TokenMetricsState>({
    tokenCount: 0,
    startTime: null,
    endTime: null,
    pausedTime: 0,
    isPaused: false,
    isActive: false,
  });

  const totalTokensRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<Date | null>(null);

  // TODO
  // Simple tokenizer, estimates tokens by word count * 1.3 (rough approximation)
  const estimateTokens = useCallback((text: string): number => {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }, []);

  // Start tracking metrics for a new agent request
  const startRequest = useCallback(() => {
    totalTokensRef.current = 0;
    pauseStartTimeRef.current = null;
    setMetrics({
      tokenCount: 0,
      startTime: new Date(),
      endTime: null,
      pausedTime: 0,
      isPaused: false,
      isActive: true,
    });
  }, []);

  // Add tokens to the current request (cumulative)
  const addTokens = useCallback((content: string) => {
    const tokens = estimateTokens(content);
    totalTokensRef.current += tokens;
    setMetrics(prev => ({
      ...prev,
      tokenCount: totalTokensRef.current,
    }));
  }, [estimateTokens]);

  // Pause metrics (e.g., waiting for user approval)
  const pauseMetrics = useCallback(() => {
    if (pauseStartTimeRef.current) return; // Already paused
    
    pauseStartTimeRef.current = new Date();
    setMetrics(prev => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  // Resume metrics after pause
  const resumeMetrics = useCallback(() => {
    if (!pauseStartTimeRef.current) return; // Not paused
    
    const pauseDuration = Date.now() - pauseStartTimeRef.current.getTime();
    pauseStartTimeRef.current = null;
    
    setMetrics(prev => ({
      ...prev,
      pausedTime: prev.pausedTime + pauseDuration,
      isPaused: false,
    }));
  }, []);

  // Complete the current request
  const completeRequest = useCallback(() => {
    // If we're paused when completing, account for that pause time
    if (pauseStartTimeRef.current) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current.getTime();
      pauseStartTimeRef.current = null;
      
      setMetrics(prev => ({
        ...prev,
        endTime: new Date(),
        pausedTime: prev.pausedTime + pauseDuration,
        isPaused: false,
        isActive: false,
      }));
    } else {
      setMetrics(prev => ({
        ...prev,
        endTime: new Date(),
        isPaused: false,
        isActive: false,
      }));
    }
  }, []);

  // Reset all metrics
  const resetMetrics = useCallback(() => {
    totalTokensRef.current = 0;
    pauseStartTimeRef.current = null;
    setMetrics({
      tokenCount: 0,
      startTime: null,
      endTime: null,
      pausedTime: 0,
      isPaused: false,
      isActive: false,
    });
  }, []);

  return {
    ...metrics,
    startRequest,
    addTokens,
    pauseMetrics,
    resumeMetrics,
    completeRequest,
    resetMetrics,
  };
}
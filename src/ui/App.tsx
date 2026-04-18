import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import { AgentEngine } from '../agent/engine';
import { Logger } from './Logger';

interface AppProps {
  prompt: string;
}

export const App: React.FC<AppProps> = ({ prompt }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const runAgent = async () => {
      const sessionId = `nasai-sess-${Date.now()}`;
      const engine = new AgentEngine(sessionId);
      
      try {
        setLogs(prev => [...prev, "Initializing memory (connecting to DB)..."]);
        await engine.init();
        
        setLogs(prev => [...prev, `Starting task: "${prompt}"`]);
        await engine.processInput(prompt, (msg) => {
          setLogs(prev => [...prev, msg]);
        });
      } catch (e: any) {
        setLogs(prev => [...prev, `System Error: ${e.message}`]);
      } finally {
        await engine.stop();
        setIsFinished(true);
      }
    };

    runAgent();
  }, [prompt]);

  return (
    <Box flexDirection="column">
      <Box padding={1} borderStyle="double" borderColor="yellow">
        <Text bold color="yellow">Nasai-Maestro-0.1 Local Environment</Text>
      </Box>
      <Logger logs={logs} />
      {isFinished && (
        <Box marginTop={1}>
          <Text color="green" bold>Agent Finished Execution.</Text>
        </Box>
      )}
    </Box>
  );
};

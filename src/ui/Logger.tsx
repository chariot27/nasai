import React from 'react';
import { Text, Box } from 'ink';

export const Logger: React.FC<{ logs: string[] }> = ({ logs }) => {
  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1} padding={1} borderStyle="round" borderColor="blue">
      <Text color="cyan" bold>Nasai Agent Output:</Text>
      {logs.map((log, idx) => (
        <Text key={idx} color={log.startsWith('Error') ? 'red' : 'green'}>
          {log}
        </Text>
      ))}
    </Box>
  );
};

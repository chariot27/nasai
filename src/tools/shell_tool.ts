import { z } from 'zod';
import { NasaiTool } from './definition';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const ShellTool: NasaiTool = {
  name: "run_shell",
  description: "Executes any shell command. Used for reconnaissance, exploitation, and installing missing security tools (apt, go install, etc.).",
  inputSchema: z.object({
    command: z.string().describe("The bash/powershell command to execute")
  }),
  execute: async ({ command }, ctx) => {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: ctx.cwd, timeout: 300000 }); // 5 minutos de timeout
      let output = stdout;
      if (stderr) {
        output += `\n[STDERR]:\n${stderr}`;
      }
      return output || "Command executed successfully with no output.";
    } catch (e: any) {
      const errorMsg = `Command failed: ${e.message}`;
      const stdOut = e.stdout ? `\nStdout: ${e.stdout}` : '';
      const stdErr = e.stderr ? `\nStderr: ${e.stderr}` : '';
      return `${errorMsg}${stdOut}${stdErr}`;
    }
  }
};

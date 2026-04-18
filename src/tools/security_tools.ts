import { z } from 'zod';
import { NasaiTool } from './definition';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const SubfinderTool: NasaiTool = {
  name: "subfinder",
  description: "Enumerate subdomains for a given domain using subfinder. Always use this instead of run_shell for subdomain discovery.",
  inputSchema: z.object({
    domain: z.string().describe("The target domain (e.g., amazon.com)")
  }),
  execute: async ({ domain }, ctx) => {
    try {
      const { stdout, stderr } = await execAsync(`subfinder -d ${domain} -silent`, { cwd: ctx.cwd, timeout: 300000 });
      return stdout || "No subdomains found.";
    } catch (e: any) {
      return `Subfinder failed: ${e.message}\n${e.stderr}`;
    }
  }
};

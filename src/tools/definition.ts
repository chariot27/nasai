import { z } from 'zod';

export interface ToolContext {
  cwd: string;
  session: string;
}

export interface NasaiTool<T extends z.ZodTypeAny = any> {
  name: string;
  description: string;
  inputSchema: T;
  execute: (input: z.infer<T>, context: ToolContext) => Promise<string>;
}

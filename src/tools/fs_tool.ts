import { z } from 'zod';
import { NasaiTool } from './definition';
import * as fs from 'fs/promises';
import * as path from 'path';

export const EditFileTool: NasaiTool = {
  name: "edit_file",
  description: "Applies changes to a file using block search and replace. Ensures atomic updates.",
  inputSchema: z.object({
    path: z.string().describe("Relative or absolute path to the file"),
    oldText: z.string().describe("The exact code block to be replaced, including whitespace"),
    newText: z.string().describe("The new code to be inserted in place of oldText")
  }),
  execute: async ({ path: filePath, oldText, newText }, ctx) => {
    try {
      const absolutePath = path.resolve(ctx.cwd, filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      if (!content.includes(oldText)) {
        return `Error: The oldText block was not found in ${filePath}. Make sure the indentation and whitespaces match exactly.`;
      }
      
      const newContent = content.replace(oldText, newText);
      await fs.writeFile(absolutePath, newContent, 'utf-8');
      return `Successfully updated file ${filePath}.`;
    } catch (e: any) {
      return `Failed to edit file ${filePath}: ${e.message}`;
    }
  }
};

export const ReadFileTool: NasaiTool = {
  name: "read_file",
  description: "Reads the content of a file.",
  inputSchema: z.object({
    path: z.string().describe("Relative or absolute path to the file")
  }),
  execute: async ({ path: filePath }, ctx) => {
    try {
      const absolutePath = path.resolve(ctx.cwd, filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      return content;
    } catch (e: any) {
      return `Failed to read file ${filePath}: ${e.message}`;
    }
  }
};

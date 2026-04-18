import { ModelProvider } from '../bridge/provider';
import { NasaiTool } from '../tools/definition';
import { EditFileTool, ReadFileTool } from '../tools/fs_tool';
import { ShellTool } from '../tools/shell_tool';
import { SubfinderTool } from '../tools/security_tools';
import { Memory, AgentState } from './memory';

export class AgentEngine {
  private provider: ModelProvider;
  private memory: Memory;
  private tools: NasaiTool[];
  private state: AgentState;
  private messages: any[];
  private consecutiveSameAction = 0;
  private lastAction = '';

  constructor(sessionId: string) {
    this.provider = new ModelProvider();
    this.memory = new Memory();
    this.tools = [EditFileTool, ReadFileTool, ShellTool, SubfinderTool];
    this.state = {
      session: sessionId,
      status: 'idling',
      tokens_used: 0
    };
    this.messages = [{
      role: 'system',
      content: `You are nasai-maestro-9.0, a state-of-the-art autonomous AI Red Team agent. 
      CRITICAL INSTRUCTIONS:
      1. You must execute user requests using the available tools with maximum precision.
      2. If a tool is missing (e.g., 'command not found'), you are authorized to attempt installation using 'apt' or other package managers via run_shell.
      3. All installed tools must be used immediately to fulfill the request.
      4. For long-running scans (nmap, subfinder), wait for the tool to complete. The timeout is set to 5 minutes.
      5. Analyze tool outputs to find vulnerabilities and provide a comprehensive summary.`
    }];
  }

  async init() {
    await this.memory.connect();
    await this.memory.saveSession(this.state);
  }

  async processInput(userInput: string, onUpdate: (msg: string) => void) {
    this.state.status = 'thinking';
    this.consecutiveSameAction = 0;
    this.lastAction = '';
    
    onUpdate(`Processing: ${userInput}`);

    this.messages.push({ role: 'user', content: userInput });

    let isDone = false;
    let iterations = 0;
    let toolExecutions = 0;

    while (!isDone && iterations < 10 && toolExecutions < 5) {
      iterations++;
      onUpdate(`Thinking... (Iteration ${iterations})`);
      
      const response = await this.provider.generate(this.messages, this.tools);
      this.messages.push(response);

      if (response.tool_calls && response.tool_calls.length > 0) {
        this.state.status = 'acting';
        
        for (const call of response.tool_calls) {
          const functionName = call.function.name;
          const args = JSON.parse(call.function.arguments);
          const actionKey = `${functionName}:${JSON.stringify(args)}`;
          
          onUpdate(`Executing Tool: ${functionName} with args: ${JSON.stringify(args)}`);
          
          const tool = this.tools.find(t => t.name === functionName);
          let toolResult = '';
          let isError = false;
          if (tool) {
            toolResult = await tool.execute(args, { cwd: process.cwd(), session: this.state.session });
            if (toolResult.startsWith("Error:") || toolResult.startsWith("Command failed")) {
               isError = true;
            }
          } else {
            toolResult = `Error: Tool ${functionName} not found.`;
            isError = true;
          }

          onUpdate(`Tool Result: ${toolResult.substring(0, 200)}`);

          this.messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: functionName,
            content: toolResult
          });

          toolExecutions++;

          if (toolResult.includes('executed successfully') || toolResult.includes('completed') || toolResult.includes('Done')) {
             onUpdate(`Task completed successfully.`);
             this.messages.push({
               role: 'system',
               content: `The task has been completed successfully. Provide a summary to the user now.`
             });
          }

          this.lastAction = actionKey;
          
          if (toolResult.includes('successfully') || !isError) {
            onUpdate(`Task completed via tool execution.`);
            isDone = true;
            break;
          }

          if (isError) {
             onUpdate(`Reflexion triggered: Correcting tool usage error...`);
             this.messages.push({
               role: 'system',
               content: `REFLEXION: The previous tool call failed. Analyze the error and provide a different approach. Then respond with a summary.`
             });
           }
        }
      } else if (response.content) {
        isDone = true;
        this.state.status = 'idling';
        onUpdate(`Agent: ${response.content}`);
        await this.memory.saveMessage(this.state.session, 'assistant', response.content || 'Action completed.');
      }
    }

    if (iterations >= 10 || toolExecutions >= 5) {
      onUpdate("Task execution complete.");
    }
    
    onUpdate("Saving experience for continuous learning...");
    await this.memory.saveExperience(this.state.session, this.messages);
  }

  async stop() {
    await this.memory.disconnect();
  }
}

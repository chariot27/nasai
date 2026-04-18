import { ModelProvider } from '../bridge/provider';

export interface TaskPlan {
  steps: string[];
  rationale: string;
}

export class Planner {
  private provider: ModelProvider;

  constructor() {
    this.provider = new ModelProvider();
  }

  async createPlan(userInput: string): Promise<TaskPlan> {
    const prompt = `
You are the System 2 Thinking (Planner) module of Nasai-Maestro-0.1.
Your job is to analyze the user's request and break it down into a sequence of atomic tool executions.

CRITICAL RULE: Whatever you execute or plan to do MUST be explicitly tested, analyzed, and validated by you at the end of the plan. You must act as a precise auditor of your own actions.

User Request: "${userInput}"

Output ONLY a valid JSON object in this exact format (no markdown code blocks, keep rationale extremely short and concise to save processing time):
{
  "rationale": "Max 1 sentence explaining why and how we will test.",
  "steps": ["Step 1", "Step 2"]
}
`;

    try {
      const response = await this.provider.generate([
        { role: 'system', content: 'You are a task planning agent. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ], []);
      
      const parsed = JSON.parse(response.content.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed;
    } catch (e) {
      // Fallback if parsing fails or model acts up
      return { rationale: "Fallback direct execution", steps: ["Execute user request directly"] };
    }
  }
}

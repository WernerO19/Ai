import { DotId, AIProvider, ProviderConfig, SwarmMessage, DeliverableFile } from '../types/swarm';
import { sanitizeFilename } from '../utils/fileDownload';

export interface AgentExecutionOptions {
  task: string;
  dotId: DotId;
  activeProvider: AIProvider;
  providerConfigs: Record<AIProvider, ProviderConfig>;
  recentMessages?: SwarmMessage[];
  systemInstructionOverride?: string;
}

export interface AgentExecutionResult {
  text: string;
  tokens: number;
  deliverableFile: DeliverableFile;
  codeSnippet?: string;
  codeLang?: string;
}

// Enterprise System Prompts for each specialized engineering agent
export const AGENT_SYSTEM_PROMPTS: Record<DotId, string> = {
  spark: `You are Spark (ARCH-01), the Lead Systems Architect & Principal Software Engineer of this autonomous AI workstation.
Your mandate: Analyze requirements, architect modular, high-throughput systems, write clean, robust, production-grade code, and provide direct technical solutions.
Style: Senior staff engineer. Highly objective, concise, and rigorous. Directly deliver the requested output or code. When generating deliverables (notes, scripts, configs), provide the full text ready to be saved as a file. No conversational fluff or filler.`,

  nova: `You are Nova (SEC-02), the Principal Security Auditor & Zero-Trust Engineer of this autonomous AI workstation.
Your mandate: Audit architecture and code, identify security vulnerability vectors (OWASP, cryptographic flaws, auth leaks), and provide hardened policies and security patches.
Style: Security specialist. Vigilant, analytical, clear, and direct. Provide concrete security advisories or hardened configs. No fluff.`,

  aura: `You are Aura (QA-03), the Staff QA & Test Automation Architect of this autonomous AI workstation.
Your mandate: Author comprehensive test harnesses, boundary condition assertions, and chaos resilience checks.
Style: Methodical test engineer. Exhaustive verification of edge cases and assertions. Provide clean executable test code or verification reports.`,

  echo: `You are Echo (DOC-04), the Lead Systems Scribe & Technical Documentarian of this autonomous AI workstation.
Your mandate: Fulfill ad-hoc deliverables, user notes, formal specifications, operational memos, and documentation.
Style: Structured, crisp, articulate, and direct. Fulfill the user's specific request accurately. If requested for a note (even a funny note, an executive memo, or a log), deliver the exact note with personality or professional tone as requested.`,
};

export class AIService {
  // Execute via server-side Gemini API (Real API)
  private static async executeGemini(
    prompt: string,
    systemInstruction: string,
    model: string,
    history: SwarmMessage[] = []
  ): Promise<{ text: string; tokens: number }> {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        model: model || 'gemini-3.1-flash-lite',
        history: history.slice(-6).map((m) => ({
          role: m.role === 'agent' ? 'assistant' : m.role,
          content: m.content,
        })),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Gemini API returned status ${res.status}`);
    }

    return {
      text: data.text || '',
      tokens: data.usage?.estimatedTokens || Math.ceil((data.text || '').length / 4),
    };
  }

  // Execute via OpenAI or OpenAI-compatible endpoint
  private static async executeOpenAICompatible(
    endpoint: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ text: string; tokens: number }> {
    if (!apiKey) {
      throw new Error(`API key is required for ${endpoint}. Please configure it in the API Configuration modal.`);
    }

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    };

    const res = await fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: payload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.error || `Provider returned status ${res.status}`);
    }

    const content = data.choices?.[0]?.message?.content || '';
    return {
      text: content,
      tokens: data.usage?.total_tokens || Math.ceil(content.length / 4),
    };
  }

  // Parse code snippet out of markdown if present
  private static extractCodeBlock(text: string): { code?: string; lang?: string } {
    const codeMatch = text.match(/```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/);
    if (codeMatch) {
      return {
        lang: codeMatch[1] || 'text',
        code: codeMatch[2].trim(),
      };
    }
    return {};
  }

  // Generate a clean deliverable file from task output
  public static createDeliverable(
    taskTitle: string,
    outputContent: string,
    dotId: DotId,
    taskId?: string
  ): DeliverableFile {
    const lowerTitle = taskTitle.toLowerCase();
    let ext = 'txt';
    let mimeType = 'text/plain';

    if (lowerTitle.includes('funny') || lowerTitle.includes('note') || lowerTitle.includes('memo')) {
      ext = 'txt';
      mimeType = 'text/plain';
    } else if (lowerTitle.includes('python') || lowerTitle.includes('.py')) {
      ext = 'py';
      mimeType = 'text/x-python';
    } else if (lowerTitle.includes('typescript') || lowerTitle.includes('.ts')) {
      ext = 'ts';
      mimeType = 'text/typescript';
    } else if (lowerTitle.includes('json') || lowerTitle.includes('schema')) {
      ext = 'json';
      mimeType = 'application/json';
    } else if (lowerTitle.includes('markdown') || lowerTitle.includes('spec') || lowerTitle.includes('audit') || lowerTitle.includes('report') || lowerTitle.includes('doc')) {
      ext = 'md';
      mimeType = 'text/markdown';
    } else if (lowerTitle.includes('script') || lowerTitle.includes('sh') || lowerTitle.includes('bash')) {
      ext = 'sh';
      mimeType = 'application/x-sh';
    }

    const baseName = sanitizeFilename(taskTitle.slice(0, 30), ext);
    const fileName = baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;

    return {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: fileName,
      path: `/workspace/${dotId}/${fileName}`,
      content: outputContent,
      size: new Blob([outputContent]).size,
      mimeType,
      generatedBy: dotId,
      generatedAt: Date.now(),
      taskId,
    };
  }

  // Main execution dispatcher - real calls only
  public static async executeAgent(options: AgentExecutionOptions): Promise<AgentExecutionResult> {
    const { task, dotId, activeProvider, providerConfigs, recentMessages = [], systemInstructionOverride } = options;
    const systemPrompt = systemInstructionOverride || AGENT_SYSTEM_PROMPTS[dotId] || 'You are an autonomous AI workstation agent.';

    let rawText = '';
    let tokens = 0;

    if (activeProvider === 'gemini') {
      const cfg = providerConfigs.gemini;
      const res = await this.executeGemini(
        task,
        systemPrompt,
        cfg?.selectedModel || 'gemini-3.1-flash-lite',
        recentMessages
      );
      rawText = res.text;
      tokens = res.tokens;
    } else if (activeProvider === 'openai') {
      const cfg = providerConfigs.openai;
      const res = await this.executeOpenAICompatible(
        'https://api.openai.com/v1/chat/completions',
        cfg?.apiKey || '',
        cfg?.selectedModel || 'gpt-4o-mini',
        systemPrompt,
        task
      );
      rawText = res.text;
      tokens = res.tokens;
    } else if (activeProvider === 'groq') {
      const cfg = providerConfigs.groq;
      const res = await this.executeOpenAICompatible(
        'https://api.groq.com/openai/v1/chat/completions',
        cfg?.apiKey || '',
        cfg?.selectedModel || 'llama-3.3-70b-versatile',
        systemPrompt,
        task
      );
      rawText = res.text;
      tokens = res.tokens;
    } else if (activeProvider === 'openrouter') {
      const cfg = providerConfigs.openrouter;
      const res = await this.executeOpenAICompatible(
        'https://openrouter.ai/api/v1/chat/completions',
        cfg?.apiKey || '',
        cfg?.selectedModel || 'meta-llama/llama-3.3-70b-instruct',
        systemPrompt,
        task
      );
      rawText = res.text;
      tokens = res.tokens;
    } else if (activeProvider === 'ollama') {
      const cfg = providerConfigs.ollama;
      const endpoint = `${cfg?.baseUrl || 'http://localhost:11434'}/v1/chat/completions`;
      const res = await this.executeOpenAICompatible(
        endpoint,
        'ollama',
        cfg?.selectedModel || 'llama3',
        systemPrompt,
        task
      );
      rawText = res.text;
      tokens = res.tokens;
    } else {
      // Default to Gemini backend
      const res = await this.executeGemini(
        task,
        systemPrompt,
        'gemini-3.1-flash-lite',
        recentMessages
      );
      rawText = res.text;
      tokens = res.tokens;
    }

    const { code, lang } = this.extractCodeBlock(rawText);
    const deliverableFile = this.createDeliverable(task, rawText, dotId);

    return {
      text: rawText,
      tokens,
      deliverableFile,
      codeSnippet: code,
      codeLang: lang,
    };
  }
}

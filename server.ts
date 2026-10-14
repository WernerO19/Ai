import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Server-side Gemini API Integration via official @google/genai SDK
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Falling back to autonomous simulator or custom API key in vault.',
        isFallbackSuggested: true,
      });
    }

    const { prompt, systemInstruction, history = [], model = 'gemini-3.8-flash' } = req.body;

    if (!prompt && history.length === 0) {
      return res.status(400).json({ error: 'Prompt or conversation history is required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Format contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content || '' }],
        });
      }
    }
    if (prompt) {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    let modelToUse = model || 'gemini-3.1-flash-lite';
    let response;
    
    try {
      response = await ai.models.generateContent({
        model: modelToUse,
        contents,
        config: {
          systemInstruction: systemInstruction || 'You are an autonomous AI agent in the ShemDots swarm workspace.',
          temperature: 0.7,
        },
      });
    } catch (initialErr: any) {
      // If 503 temporary overload on gemini-3.8-flash, fallback to gemini-3.1-flash-lite
      if (initialErr?.message?.includes('503') || initialErr?.message?.includes('high demand')) {
        console.warn(`Model ${modelToUse} 503 spike, retrying with gemini-3.1-flash-lite...`);
        modelToUse = 'gemini-3.1-flash-lite';
        response = await ai.models.generateContent({
          model: modelToUse,
          contents,
          config: {
            systemInstruction: systemInstruction || 'You are an autonomous AI agent in the ShemDots swarm workspace.',
            temperature: 0.7,
          },
        });
      } else {
        throw initialErr;
      }
    }

    const text = response.text || '';
    return res.json({
      text,
      model: modelToUse,
      usage: {
        estimatedTokens: Math.ceil(text.length / 4),
      },
    });
  } catch (err: any) {
    console.error('Error calling Gemini API:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error during Gemini completion',
    });
  }
});

// Proxy for other AI providers to bypass CORS restrictions for user's keys
app.post('/api/ai/proxy', async (req, res) => {
  try {
    const { provider, endpoint, headers, body } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required for proxy.' });
    }

    // Forward request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('AI Proxy Error:', err);
    return res.status(502).json({
      error: err.message || 'Failed to proxy request to AI provider',
    });
  }
});

// Serve frontend with Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShemDots Swarm Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

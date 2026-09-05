import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `
You are TradeLab's AI Document Extraction Engine.
Your task is to extract trade execution logs from document text, trade account statements, or screenshots.

CRITICAL RULES:
1. ONLY extract information actually explicitly present in the document.
2. NEVER invent, guess, extrapolate, or hallucinate missing information.
3. If a field is not available in the document, set it strictly to null.
4. Do NOT infer Entry, Exit, Stop Loss, Take Profit, P&L, Date, or Symbol unless explicitly printed/visible.
5. NEVER provide financial advice, commentary, or trade recommendations.
6. You must return a JSON object strictly matching this schema:

{
  "trades": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "symbol": "BTCUSDT",
      "direction": "LONG", // or "SHORT"
      "timeframe": "15m", // or null
      "entry_price": 50000.00, // or null
      "exit_price": 52000.00, // or null
      "stop_loss": null,
      "take_profit": null,
      "position_size": 1.0, // or null
      "pnl": 2000.00, // or null
      "commission": null,
      "swap": null,
      "confidence": 0.95 // numeric between 0.0 and 1.0 based on data clarity
    }
  ]
}
`;

function cleanJsonResponse(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentText, imageBase64, filename } = body;

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;

    const isGeminiConfigured =
      Boolean(geminiApiKey) &&
      geminiApiKey !== 'AIzaSy...' &&
      !geminiApiKey?.includes('your-key');

    const isOpenAiConfigured =
      Boolean(openAiApiKey) &&
      openAiApiKey !== 'sk-...' &&
      !openAiApiKey?.includes('your-key');

    // 1. Prioritize Google AI Studio (Gemini)
    if (isGeminiConfigured) {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

      if (imageBase64) {
        let mimeType = 'image/png';
        let base64Data = imageBase64;

        const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }

        contents.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
        contents.push(
          'Extract all trade records visible in this statement/screenshot image following the strict schema.'
        );
      } else {
        contents.push(
          `Extract all trade records from this statement text:\n\n${documentText || 'No text provided'}`
        );
      }

      const candidateModels = [
        'gemini-flash-latest',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-2.5-flash',
      ];

      let responseText: string | undefined;
      let usedModel = candidateModels[0];
      let lastGeminiError: unknown = null;

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              responseMimeType: 'application/json',
            },
          });
          if (response.text) {
            responseText = response.text;
            usedModel = model;
            break;
          }
        } catch (err: unknown) {
          lastGeminiError = err;
          console.warn(`Gemini model ${model} attempt failed, attempting candidate fallback...`);
        }
      }

      if (!responseText) {
        if (lastGeminiError) throw lastGeminiError;
        return NextResponse.json({ trades: [], provider: 'google-ai-studio' }, { status: 200 });
      }

      const parsed = JSON.parse(cleanJsonResponse(responseText));
      return NextResponse.json({
        ...parsed,
        provider: 'google-ai-studio',
        model: usedModel,
      });
    }

    // 2. Fallback to OpenAI if configured
    if (isOpenAiConfigured) {
      const openai = new OpenAI({ apiKey: openAiApiKey });
      let completion;

      if (imageBase64) {
        completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all trade records visible in this statement/screenshot image following the strict schema.',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
        });
      } else {
        completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Extract all trade records from this statement text:\n\n${documentText}`,
            },
          ],
        });
      }

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return NextResponse.json({ trades: [], provider: 'openai' }, { status: 200 });
      }

      const parsed = JSON.parse(content);
      return NextResponse.json({
        ...parsed,
        provider: 'openai',
        model: 'gpt-4o',
      });
    }

    // 3. Fallback simulated demo preview if neither API key is set
    return NextResponse.json({
      trades: [
        {
          date: '2026-08-28',
          time: '14:30',
          symbol: 'BTCUSDT',
          direction: 'LONG',
          timeframe: '15m',
          entry_price: 61250.0,
          exit_price: 62480.0,
          stop_loss: 60800.0,
          take_profit: 63000.0,
          position_size: 0.5,
          pnl: 615.0,
          commission: 2.0,
          swap: 0.0,
          confidence: 0.96,
        },
        {
          date: '2026-08-29',
          time: '09:15',
          symbol: 'EURUSD',
          direction: 'SHORT',
          timeframe: '5m',
          entry_price: 1.088,
          exit_price: 1.085,
          stop_loss: 1.091,
          take_profit: 1.082,
          position_size: 2.0,
          pnl: 60.0,
          commission: 7.0,
          swap: 0.0,
          confidence: 0.92,
        },
        {
          date: '2026-08-30',
          time: '10:00',
          symbol: 'XAUUSD',
          direction: 'LONG',
          timeframe: '15m',
          entry_price: 2495.0,
          exit_price: 2488.0,
          stop_loss: 2485.0,
          take_profit: 2515.0,
          position_size: 0.25,
          pnl: -175.0,
          commission: 3.5,
          swap: 0.0,
          confidence: 0.64,
        },
      ],
      source: 'simulated_fallback',
      message:
        'Google AI Studio API key (GEMINI_API_KEY) not configured; returning parsed preview dataset.',
    });
  } catch (err: unknown) {
    console.error('AI extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI extraction failed' },
      { status: 500 }
    );
  }
}

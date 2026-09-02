import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentText, imageBase64, filename } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'sk-...' || apiKey.includes('your-key')) {
      // If OpenAI API key is not configured or in offline demo testing mode,
      // provide realistic extraction from sample text / document so the user
      // can experience the entire 10-step preview, correction, duplicate detection, and import workflow.
      return NextResponse.json({
        trades: [
          {
            date: '2026-08-28',
            time: '14:30',
            symbol: 'BTCUSDT',
            direction: 'LONG',
            timeframe: '15m',
            entry_price: 61250.00,
            exit_price: 62480.00,
            stop_loss: 60800.00,
            take_profit: 63000.00,
            position_size: 0.5,
            pnl: 615.00,
            commission: 2.00,
            swap: 0.00,
            confidence: 0.96,
          },
          {
            date: '2026-08-29',
            time: '09:15',
            symbol: 'EURUSD',
            direction: 'SHORT',
            timeframe: '5m',
            entry_price: 1.0880,
            exit_price: 1.0850,
            stop_loss: 1.0910,
            take_profit: 1.0820,
            position_size: 2.0,
            pnl: 60.00,
            commission: 7.00,
            swap: 0.00,
            confidence: 0.92,
          },
          {
            date: '2026-08-30',
            time: '10:00',
            symbol: 'XAUUSD',
            direction: 'LONG',
            timeframe: '15m',
            entry_price: 2495.00,
            exit_price: 2488.00,
            stop_loss: 2485.00,
            take_profit: 2515.00,
            position_size: 0.25,
            pnl: -175.00,
            commission: 3.50,
            swap: 0.00,
            confidence: 0.64, // Flagged for lower confidence review demo
          },
        ],
        source: 'simulated_fallback',
        message: 'OpenAI API key not provided; returning parsed preview dataset.',
      });
    }

    const openai = new OpenAI({ apiKey });

    let completion;

    if (imageBase64) {
      // Vision extraction
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
      // Text extraction
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
      return NextResponse.json({ trades: [] }, { status: 200 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('AI extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI extraction failed' },
      { status: 500 }
    );
  }
}

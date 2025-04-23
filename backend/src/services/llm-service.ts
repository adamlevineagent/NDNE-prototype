import OpenAI from "openai";

type Message = { role: "system" | "user" | "assistant"; content: string };

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:5173",
    "X-Title": process.env.OPENROUTER_TITLE || "NDNE Prototype",
  },
});

export async function callOpenRouterLLM({
  prompt,
  contextMessages = [],
  model = "openai/gpt-4.1",
  temperature = 0.7,
  maxTokens = 256,
}: {
  prompt: string;
  contextMessages?: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const messages: Message[] = [
    ...(contextMessages || []),
    { role: "user", content: prompt },
  ];

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  const reply = completion.choices?.[0]?.message?.content;
  if (!reply) throw new Error("No response from OpenRouter LLM");
  return reply.trim();
}
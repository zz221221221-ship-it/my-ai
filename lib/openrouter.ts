const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3.5-flash";

// 경량화된 단일 AI 응답용 (병렬 처리)
export async function callOpenRouterSingle(params: {
  systemPrompt: string;
  userContent: string;
  timeout?: number;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const timeout = params.timeout ?? 30000; // 기본 30초

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3001",
        "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "AI Persona Social Deduction"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        temperature: 0.8,
        max_tokens: 3000,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userContent }
        ]
      }),
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) return null;

    const json = await response.json();
    return json.choices?.[0]?.message?.content as string | undefined ?? null;
  } catch {
    return null;
  }
}

// 기존 호환용 (여러 메시지 지원)
export async function callOpenRouterChat(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3001",
        "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "AI Persona Social Deduction"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        temperature: 0.8,
        max_tokens: 3000,
        messages
      }),
      signal: AbortSignal.timeout(30_000) // 30초
    });

    if (!response.ok) return null;

    const json = await response.json();
    return json.choices?.[0]?.message?.content as string | undefined;
  } catch {
    return null;
  }
}

// 병렬 AI 응답 처리
export async function callOpenRouterParallel(
  tasks: Array<{ id: string; systemPrompt: string; userContent: string }>,
  timeout?: number
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  const promises = tasks.map(async (task) => {
    const result = await callOpenRouterSingle({
      systemPrompt: task.systemPrompt,
      userContent: task.userContent,
      timeout
    });
    return { id: task.id, result };
  });

  const settled = await Promise.allSettled(promises);
  
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.set(outcome.value.id, outcome.value.result);
    }
  }

  return results;
}
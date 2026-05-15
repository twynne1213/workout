// Claude API service - connects through Supabase Edge Function
// For local development, you can configure VITE_CLAUDE_API_KEY directly

const CLAUDE_API_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`
  : null;

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamChat(
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!CLAUDE_API_URL) {
    // Fallback for local dev without Supabase
    onChunk("Coach is not configured yet. Set up your Supabase Edge Function and VITE_SUPABASE_URL environment variable to enable AI coaching.\n\nIn the meantime, here's a general tip: consistency beats intensity. Show up regularly, progressively overload, and prioritize recovery.");
    onDone();
    return;
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ messages, systemPrompt }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  if (!response.body) { onDone(); return; }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) { onDone(); break; }
    onChunk(decoder.decode(value));
  }
}

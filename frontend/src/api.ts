import type { UIMessage } from "./types";

function uiMessageText(m: UIMessage): string {
  if (typeof m.content === "string") return m.content;
  if (!m.parts) return "";
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export async function getPublicChat(): Promise<{ messages: UIMessage[] }> {
  const res = await fetch("/chatbot/api/public-chat", { credentials: "include" });
  if (!res.ok) throw new Error(`GET /public-chat failed: ${res.status}`);
  return res.json();
}

type StreamHandlers = {
  onTextDelta: (delta: string) => void;
  onDone: () => void;
};

function consumeSseText(streamText: string, handlers: StreamHandlers) {
  // Very small SSE parser for the Vercel AI SDK "data stream protocol".
  // We only care about incremental text deltas.
  const events = streamText.split("\n\n");
  for (const evt of events) {
    const lines = evt.split("\n");
    const dataLines = lines.filter((l) => l.startsWith("data:")).map((l) => l.slice("data:".length).trimStart());
    if (dataLines.length === 0) continue;

    const data = dataLines.join("\n");
    if (data === "[DONE]") {
      handlers.onDone();
      continue;
    }

    // Prefer JSON payloads used by the AI SDK.
    try {
      const obj = JSON.parse(data) as any;
      const delta =
        (typeof obj?.textDelta === "string" && obj.textDelta) ||
        (typeof obj?.delta === "string" && obj.delta) ||
        (typeof obj?.value === "string" && obj.value) ||
        (typeof obj?.text === "string" && obj.text) ||
        "";
      if (delta) handlers.onTextDelta(delta);
      if (obj?.type === "done") handlers.onDone();
    } catch {
      // Fallback: treat as raw text.
      if (data) handlers.onTextDelta(data);
    }
  }
}

export async function postPublicChatStreaming(params: {
  messages: UIMessage[];
  onTextDelta: (delta: string) => void;
}): Promise<void> {
  const res = await fetch("/chatbot/api/public-chat", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: params.messages })
  });

  if (!res.ok) throw new Error(`POST /public-chat failed: ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buf = "";
  let doneCalled = false;

  const handlers: StreamHandlers = {
    onTextDelta: params.onTextDelta,
    onDone: () => {
      doneCalled = true;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    if (contentType.includes("text/event-stream")) {
      // Process complete SSE frames only; keep a remainder in `buf`.
      const lastFrameSep = buf.lastIndexOf("\n\n");
      if (lastFrameSep !== -1) {
        const complete = buf.slice(0, lastFrameSep);
        buf = buf.slice(lastFrameSep + 2);
        consumeSseText(complete, handlers);
      }
    } else {
      // Non-SSE: treat chunks as text deltas.
      params.onTextDelta(buf);
      buf = "";
    }
  }

  // Flush remainder.
  if (contentType.includes("text/event-stream")) {
    consumeSseText(buf, handlers);
  } else if (buf) {
    params.onTextDelta(buf);
  }

  if (!doneCalled) handlers.onDone();
}

export function toMessagePayload(messages: UIMessage[]): UIMessage[] {
  // Ensure the API always receives "parts" (the backend persists parts to MySQL).
  return messages.map((m) => {
    const text = uiMessageText(m);
    const parts = m.parts ?? (text ? [{ type: "text", text }] : undefined);
    return { role: m.role, parts };
  });
}


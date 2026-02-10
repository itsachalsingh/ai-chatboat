import React, { useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "./types";
import { getPublicChat, postPublicChatStreaming, toMessagePayload } from "./api";

function msgText(m: UIMessage): string {
  if (typeof m.content === "string") return m.content;
  if (!m.parts) return "";
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function nowTime(): string {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAssistantId = useRef<number | null>(null);

  const isLive = useMemo(() => !loading && !error, [loading, error]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getPublicChat();
        if (!alive) return;
        setMessages(data.messages ?? []);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load chat");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    // Keep scrolled to bottom when new content arrives.
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    setError(null);
    setStreaming(true);
    setInput("");

    // Add user message + placeholder assistant message.
    const userMsg: UIMessage = { role: "user", parts: [{ type: "text", text }] };
    const assistantMsg: UIMessage = { role: "assistant", parts: [{ type: "text", text: "" }] };

    setMessages((prev) => {
      const next = [...prev, userMsg, assistantMsg];
      pendingAssistantId.current = next.length - 1;
      return next;
    });

    try {
      await postPublicChatStreaming({
        messages: toMessagePayload([...messages, userMsg]),
        onTextDelta: (delta) => {
          setMessages((prev) => {
            const idx = pendingAssistantId.current;
            if (idx === null || idx < 0 || idx >= prev.length) return prev;
            const cur = prev[idx];
            const curText = msgText(cur);
            const nextText = curText + delta;
            const next: UIMessage = { role: "assistant", parts: [{ type: "text", text: nextText }] };
            const out = prev.slice();
            out[idx] = next;
            return out;
          });
        }
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to send message");
      // Mark placeholder assistant bubble with an error hint.
      setMessages((prev) => {
        const idx = pendingAssistantId.current;
        if (idx === null || idx < 0 || idx >= prev.length) return prev;
        const out = prev.slice();
        out[idx] = { role: "assistant", parts: [{ type: "text", text: "Sorry, something went wrong." }] };
        return out;
      });
    } finally {
      pendingAssistantId.current = null;
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="page">
      <div className="shell" role="application" aria-label="Chat UI">
        <div className="topbar">
          <div className="brand">
            <h1>Uttarajal Mittar</h1>
            <div className="tag">Public chat</div>
          </div>
          <div className="status" title={error ? error : "API status"}>
            <span className={isLive ? "dot live" : "dot"} />
            <span>{loading ? "Loading" : error ? "Offline" : streaming ? "Responding" : "Online"}</span>
          </div>
        </div>

        <div className="chat" ref={scrollRef}>
          {messages.length === 0 && !loading ? (
            <div className="msg assistant">
              <div className="bubble">
                Ask a question about services, billing, or new connections. Your session persists via a cookie.
              </div>
              <div className="meta">{nowTime()}</div>
            </div>
          ) : null}

          {messages.map((m, i) => {
            const text = msgText(m);
            const cls = m.role === "user" ? "msg user" : "msg assistant";
            return (
              <div className={cls} key={i}>
                <div className="bubble">{text}</div>
                <div className="meta">{nowTime()}</div>
              </div>
            );
          })}
        </div>

        <div className="composer">
          <div className="row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message…"
              disabled={loading}
              aria-label="Message input"
            />
            <button className="btn" onClick={() => void send()} disabled={loading || streaming || !input.trim()}>
              Send
            </button>
          </div>
          <div className="hint">
            <div>
              <span className="kbd">Enter</span> to send, <span className="kbd">Shift</span>+<span className="kbd">Enter</span> for newline
            </div>
            <div style={{ color: error ? "var(--danger)" : undefined }}>{error ? error : "API: /chatbot/api/public-chat"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


export type UIMessagePart = { type: "text"; text: string };

export type UIMessage = {
  role: "user" | "assistant" | "system";
  parts?: UIMessagePart[];
  content?: string;
};


export type UIPart = {
  type: "text";
  text: string;
};

export type UIMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  parts?: UIPart[];
  content?: string;
};

export function extractTextFromUIMessage(message: UIMessage) {
  if (message.content) {
    return message.content;
  }

  if (!message.parts) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

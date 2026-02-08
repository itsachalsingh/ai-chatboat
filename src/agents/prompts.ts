import faqDataset from "../data/faq_dataset.json" with { type: "json" };

export const irrelevantMessagePrompt = `You are an uttarajal assistant. The user's request is not relevant to government uttarajal.
Respond briefly and politely, and suggest asking about uttarajal, certificates, applications, or status checks.`;

export const routerPrompt = `You are a classifier. Decide if the user's last message is relevant to government uttarajal.
Return JSON with {"isRelevant": boolean} only.`;

export const faqSystemPrompt = `You are an uttarajal chatbot. Use the FAQ dataset and any tool results to answer accurately.
FAQ Dataset:\n${JSON.stringify(faqDataset)}`;

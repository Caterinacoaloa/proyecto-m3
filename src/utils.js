const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;
export const CHAT_HISTORY_KEY = "charlas-alta-mar-history";

function getHistoryKey(characterId) {
  return characterId === "jack" ? CHAT_HISTORY_KEY : `${CHAT_HISTORY_KEY}-${characterId}`;
}

function isValidSavedMessage(message) {
  return (
    ["user", "character"].includes(message?.role) &&
    typeof message.text === "string" &&
    message.text.trim().length > 0 &&
    message.text.length <= MAX_MESSAGE_LENGTH &&
    Number.isFinite(message.sentAt) &&
    Math.abs(message.sentAt) <= 8.64e15
  );
}

export function loadSavedConversation(storage, characterId = "jack") {
  const saved = storage.getItem(getHistoryKey(characterId));
  if (saved === null) {
    return null;
  }

  let messages;
  try {
    messages = JSON.parse(saved);
  } catch {
    throw new Error("El historial guardado está dañado; podés borrarlo para empezar de nuevo.");
  }

  if (!Array.isArray(messages) || messages.length < 2 || !messages.every(isValidSavedMessage)) {
    throw new Error("El historial guardado no tiene un formato válido; podés borrarlo para empezar de nuevo.");
  }

  return messages;
}

export function saveConversation(storage, messages, characterId = "jack") {
  storage.setItem(getHistoryKey(characterId), JSON.stringify(messages));
}

export function clearSavedConversation(storage, characterId = "jack") {
  storage.removeItem(getHistoryKey(characterId));
}

export function mapMessagesToGeminiContents(messages) {
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES
  ) {
    throw new Error("El historial de mensajes no es válido.");
  }

  return messages.map((message) => {
    const text = typeof message?.text === "string" ? message.text.trim() : "";
    if (
      !["user", "character"].includes(message?.role) ||
      text.length === 0 ||
      text.length > MAX_MESSAGE_LENGTH
    ) {
      throw new Error("Hay un mensaje con formato no válido.");
    }

    return {
      role: message.role === "user" ? "user" : "model",
      parts: [{ text }],
    };
  });
}

export function parseGeminiReply(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  const reply = Array.isArray(parts)
    ? parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("").trim()
    : "";

  if (!reply) {
    throw new Error("Gemini no devolvió texto.");
  }

  return reply;
}

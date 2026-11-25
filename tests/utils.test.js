import { describe, expect, it } from "vitest";
import {
  CHAT_HISTORY_KEY,
  THEME_STORAGE_KEY,
  clearSavedConversation,
  loadSavedConversation,
  loadSavedTheme,
  mapMessagesToGeminiContents,
  parseGeminiReply,
  saveConversation,
  saveSavedTheme,
} from "../src/utils.js";

describe("mapMessagesToGeminiContents", () => {
  it("maps user and character roles and trims message text", () => {
    expect(
      mapMessagesToGeminiContents([
        { role: "user", text: " Hola " },
        { role: "character", text: " Buen viaje " },
      ]),
    ).toEqual([
      { role: "user", parts: [{ text: "Hola" }] },
      { role: "model", parts: [{ text: "Buen viaje" }] },
    ]);
  });

  it("rejects an empty message history", () => {
    expect(() => mapMessagesToGeminiContents([])).toThrow(
      "El historial de mensajes no es válido.",
    );
  });
});

describe("parseGeminiReply", () => {
  it("joins and trims text parts from Gemini", () => {
    expect(
      parseGeminiReply({
        candidates: [
          { content: { parts: [{ text: " Ahoy " }, { text: "marinero " }] } },
        ],
      }),
    ).toBe("Ahoy marinero");
  });

  it("rejects responses without usable text", () => {
    expect(() => parseGeminiReply({ candidates: [] })).toThrow(
      "Gemini no devolvió texto.",
    );
  });
});

describe("theme persistence", () => {
  function createStorage() {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
  }

  it("uses dark theme by default", () => {
    expect(loadSavedTheme(createStorage())).toBe(false);
  });

  it("saves and loads the light theme", () => {
    const storage = createStorage();

    saveSavedTheme(storage, true);

    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(loadSavedTheme(storage)).toBe(true);
  });
});

describe("conversation persistence", () => {
  function createStorage() {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
  }

  it("saves and loads a conversation", () => {
    const storage = createStorage();
    const messages = [
      { role: "character", text: "¡Ahoy!", sentAt: 100 },
      { role: "user", text: "Hola", sentAt: 200 },
    ];

    saveConversation(storage, messages);

    expect(storage.getItem(CHAT_HISTORY_KEY)).toBe(JSON.stringify(messages));
    expect(loadSavedConversation(storage)).toEqual(messages);
  });

  it("returns null when no conversation has been saved", () => {
    expect(loadSavedConversation(createStorage())).toBeNull();
  });

  it("rejects malformed saved histories", () => {
    const storage = createStorage();
    storage.setItem(CHAT_HISTORY_KEY, JSON.stringify([{ role: "user", text: "Hola" }]));

    expect(() => loadSavedConversation(storage)).toThrow(
      "El historial guardado no tiene un formato válido",
    );
  });

  it("clears the saved conversation", () => {
    const storage = createStorage();
    storage.setItem(CHAT_HISTORY_KEY, "[]");

    clearSavedConversation(storage);

    expect(loadSavedConversation(storage)).toBeNull();
  });

  it("keeps conversations separate by character", () => {
    const storage = createStorage();
    const jackMessages = [
      { role: "character", text: "¡Ahoy!", sentAt: 100 },
      { role: "user", text: "Hola Jack", sentAt: 200 },
    ];
    const tiaMessages = [
      { role: "character", text: "Las aguas hablan", sentAt: 300 },
      { role: "user", text: "Hola Tia", sentAt: 400 },
    ];

    saveConversation(storage, jackMessages, "jack");
    saveConversation(storage, tiaMessages, "tia-dalma");

    expect(loadSavedConversation(storage, "jack")).toEqual(jackMessages);
    expect(loadSavedConversation(storage, "tia-dalma")).toEqual(tiaMessages);
    expect(loadSavedConversation(storage, "davy-jones")).toBeNull();
  });
});

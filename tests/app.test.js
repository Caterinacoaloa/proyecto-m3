import { describe, expect, it } from "vitest";
import {
  buildChatRequest,
  characters,
  createGreeting,
  formatMessageTime,
  getCharacter,
} from "../src/chat.js";

describe("character chat configuration", () => {
  it("contains the three selectable characters", () => {
    expect(Object.keys(characters)).toEqual(["jack", "davy-jones", "tia-dalma"]);
  });

  it("falls back to Jack for an unknown character", () => {
    expect(getCharacter("unknown").id).toBe("jack");
  });

  it("creates a greeting for the selected character", () => {
    const greeting = createGreeting("tia-dalma");

    expect(greeting.role).toBe("character");
    expect(greeting.text).toContain("aguas");
    expect(Number.isFinite(greeting.sentAt)).toBe(true);
  });

  it("formats message timestamps and builds API payloads", () => {
    const sentAt = Date.UTC(2026, 10, 21, 20, 30);
    const formatted = formatMessageTime(sentAt);

    expect(formatted.dateTime).toBe(new Date(sentAt).toISOString());
    expect(formatted.label).toMatch(/\d{1,2}:\d{2}/);
    expect(
      buildChatRequest("davy-jones", [
        { role: "user", text: "Hola", sentAt },
      ]),
    ).toEqual({
      characterId: "davy-jones",
      messages: [{ role: "user", text: "Hola", sentAt }],
    });
  });
});

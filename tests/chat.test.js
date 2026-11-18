import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../api/chat.js";

function createResponse() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/chat", () => {
  it("rejects methods other than POST", async () => {
    const response = createResponse();

    await handler({ method: "GET" }, response);

    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe("POST");
    expect(response.body.error).toBe("Método no permitido.");
  });

  it("reports a missing API key without calling Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = createResponse();

    await handler({ method: "POST", body: { messages: [{ role: "user", text: "Hola" }] } }, response);

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toContain("GEMINI_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid messages without calling Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = createResponse();

    await handler({ method: "POST", body: { messages: [{ role: "unknown", text: "Hola" }] } }, response);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("Hay un mensaje con formato no válido.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unknown characters without calling Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = createResponse();

    await handler(
      {
        method: "POST",
        body: {
          characterId: "unknown",
          messages: [{ role: "user", text: "Hola" }],
        },
      },
      response,
    );

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("El personaje seleccionado no es válido.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the conversation to Gemini and returns its reply", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: " ¡Ahoy! " }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = createResponse();
    const messages = [
      { role: "user", text: "Hola" },
      { role: "character", text: "¡Buen día!" },
      { role: "user", text: "¿Todo bien?" },
    ];

    await handler({ method: "POST", body: { characterId: "davy-jones", messages } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ reply: "¡Ahoy!" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("gemini-3.5-flash-lite:generateContent");
    expect(options.headers["x-goog-api-key"]).toBe("test-key");
    expect(JSON.parse(options.body).system_instruction.parts[0].text).toContain(
      "capitán de las profundidades",
    );
    expect(JSON.parse(options.body).contents).toEqual([
      { role: "user", parts: [{ text: "Hola" }] },
      { role: "model", parts: [{ text: "¡Buen día!" }] },
      { role: "user", parts: [{ text: "¿Todo bien?" }] },
    ]);
  });
});

import {
  mapMessagesToGeminiContents,
  parseGeminiReply,
} from "../src/utils.js";

const GEMINI_MODEL = "gemini-3.5-flash-lite";

const systemInstructions = {
  jack: `
Responde como un capitán pirata aventurero, ingenioso, teatral y astuto.
Habla en español rioplatense, con humor ligero y alguna metáfora marinera.
Responde en 1 o 2 frases cortas, idealmente menos de 35 palabras. Ve directo
al punto y evita listas, explicaciones largas y repetir la pregunta. Si no
sabes algo, dilo con naturalidad. Usa una voz propia y no reproduzcas diálogos
ni escenas de obras existentes.
`.trim(),
  "davy-jones": `
Interpreta a un capitán de las profundidades, sombrío, solemne y de pocas
palabras. Habla en español con imágenes del océano, las tormentas y las deudas
del mar. Responde en 1 o 2 frases cortas, idealmente menos de 35 palabras.
Mantén un tono misterioso sin amenazar al usuario. Usa una voz original y no
reproduzcas diálogos ni escenas de obras existentes.
`.trim(),
  "tia-dalma": `
Interpreta a una consejera caribeña enigmática, sabia e intuitiva. Habla en
español cálido con metáforas de mareas, sueños y señales, sin afirmar poderes
reales ni predecir hechos como certezas. Responde en 1 o 2 frases cortas,
idealmente menos de 35 palabras. Usa una voz original y no reproduzcas diálogos
ni escenas de obras existentes.
`.trim(),
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar GEMINI_API_KEY en las variables de entorno.",
    });
  }

  const characterId = req.body?.characterId ?? "jack";
  if (!Object.hasOwn(systemInstructions, characterId)) {
    return res.status(400).json({ error: "El personaje seleccionado no es válido." });
  }

  const messages = req.body?.messages;
  let contents;
  try {
    contents = mapMessagesToGeminiContents(messages);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstructions[characterId] }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          },
        }),
      },
    );
  } catch (error) {
    console.error("No se pudo conectar con Gemini:", error);
    return res.status(502).json({ error: "No se pudo conectar con Gemini." });
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Gemini devolvió una respuesta no válida:", error);
    return res.status(502).json({ error: "Gemini devolvió una respuesta no válida." });
  }

  if (!response.ok) {
    console.error("Error de Gemini:", response.status, data.error?.message);
    return res.status(502).json({ error: "Gemini no pudo generar una respuesta." });
  }

  let reply;
  try {
    reply = parseGeminiReply(data);
  } catch (error) {
    console.error(error.message);
    return res.status(502).json({ error: "Gemini no devolvió texto." });
  }

  return res.status(200).json({ reply });
}

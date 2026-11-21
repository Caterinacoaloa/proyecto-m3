export const characters = {
  jack: {
    id: "jack",
    name: "Jack Sparrow",
    avatar: "🏴‍☠️",
    tagline: "Capitán ingenioso e impredecible",
    description: "Astucia, humor y planes que rara vez salen como se espera.",
    greeting:
      "¡Ah, llegaste justo a tiempo! Decime, ¿qué aventura te trae por estas aguas?",
  },
  "davy-jones": {
    id: "davy-jones",
    name: "Davy Jones",
    avatar: "⚓",
    tagline: "Señor de las profundidades",
    description:
      "Una presencia sombría, solemne y ligada a los misterios del océano.",
    greeting:
      "El mar guarda muchas deudas, marinero. ¿Qué asunto te trae a mis dominios?",
  },
  "tia-dalma": {
    id: "tia-dalma",
    name: "Tia Dalma",
    avatar: "🔮",
    tagline: "Guardiana de antiguos misterios",
    description:
      "Sabiduría enigmática, intuición y relatos de magia caribeña.",
    greeting:
      "Las aguas ya susurraban que vendrías. Cuéntame, ¿qué buscas en esta marea?",
  },
};

export function getCharacter(characterId) {
  return characters[characterId] ?? characters.jack;
}

export function createGreeting(characterId) {
  const character = getCharacter(characterId);
  return {
    role: "character",
    text: character.greeting,
    sentAt: Date.now(),
  };
}

export function formatMessageTime(sentAt) {
  const messageTime = new Date(sentAt ?? Date.now());
  return {
    dateTime: messageTime.toISOString(),
    label: new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(messageTime),
  };
}

export function buildChatRequest(characterId, messages) {
  return {
    characterId: getCharacter(characterId).id,
    messages,
  };
}

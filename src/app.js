import {
  clearSavedConversation,
  loadSavedConversation,
  saveConversation,
  loadSavedTheme,
  saveSavedTheme,
} from "./utils.js";
import {
  buildChatRequest,
  characters,
  createGreeting,
  formatMessageTime,
  getCharacter,
} from "./chat.js";

const appView = document.querySelector("#app-view");

let hasSavedHistory = false;
let historyError = "";
let activeCharacterId = null;
function loadConversation(characterId) {
  hasSavedHistory = false;
  historyError = "";
  try {
    const savedMessages = loadSavedConversation(window.localStorage, characterId);
    if (savedMessages) {
      hasSavedHistory = true;
      return savedMessages;
    }
  } catch (error) {
    historyError =
      error instanceof Error ? error.message : "No se pudo cargar el historial guardado.";
  }

  return [createGreeting(characterId)];
}

let messages = [];
let isSendingMessage = false;
let sendingCharacterId = null;
let chatError = "";
let isLightTheme = false;
try {
  isLightTheme = loadSavedTheme(window.localStorage);
} catch (error) {
  console.warn(
    "No se pudo cargar el tema guardado:",
    error instanceof Error ? error.message : error,
  );
}

const routes = {
  "/home": {
    title: "Inicio | Charlas en alta mar",
    content: `
      <section class="info-panel home-panel" aria-labelledby="home-title">
        <p class="eyebrow">UNA AVENTURA TE ESPERA</p>
        <div class="hero-avatar" aria-hidden="true">🏴‍☠️</div>
        <h1 id="home-title" data-view-heading tabindex="-1">A bordo con Jack Sparrow</h1>
        <p class="page-description">
          Conversá con el capitán más impredecible de los siete mares. Compartí
          tus preguntas, buscá consejo o simplemente disfrutá de una charla
          llena de aventuras.
        </p>
        <a class="primary-link" href="/chat" data-link>Empezar a chatear</a>
      </section>
    `,
  },
  "/characters": {
    title: "Personajes | Charlas en alta mar",
    content: `
      <section class="info-panel gallery-panel" aria-labelledby="gallery-title">
        <p class="eyebrow">ELEGÍ TU COMPAÑÍA</p>
        <h1 id="gallery-title" data-view-heading tabindex="-1">Tripulación de los siete mares</h1>
        <p class="page-description">Cada personaje tiene su propia voz y una conversación independiente.</p>
        <div class="character-gallery">
          ${Object.values(characters).map((character) => `
            <article class="character-card">
              <div class="character-card-avatar" aria-hidden="true">${character.avatar}</div>
              <p class="eyebrow">${character.tagline}</p>
              <h2>${character.name}</h2>
              <p class="character-card-description">${character.description}</p>
              <a class="primary-link" href="/chat?character=${character.id}" data-link>
                Conversar
              </a>
            </article>
          `).join("")}
        </div>
      </section>
    `,
  },
  "/about": {
    title: "Acerca de | Charlas en alta mar",
    content: `
      <section class="info-panel about-panel" aria-labelledby="about-title">
        <p class="eyebrow">ACERCA DEL PROYECTO</p>
        <h1 id="about-title" data-view-heading tabindex="-1">Una charla de ficción</h1>
        <p class="page-description">
          Charlas en alta mar es un proyecto integrador para explorar cómo se
          construye una aplicación web conversacional.
        </p>
        <div class="about-character">
          <div class="character-avatar" aria-hidden="true">🏴‍☠️</div>
          <div>
            <h2>Jack Sparrow</h2>
            <p>
              Un capitán ingenioso, impredecible y siempre dispuesto a contar
              una historia de los mares.
            </p>
          </div>
        </div>
        <a class="secondary-link" href="/chat" data-link>Ir al chat</a>
      </section>
    `,
  },
};

function getRoutePath(pathname) {
  if (pathname === "/") {
    return "/home";
  }

  return pathname.replace(/\/+$/, "") || "/home";
}

function renderRoute() {
  const path = getRoutePath(window.location.pathname);
  const route = routes[path];

  if (path === "/chat") {
    const requestedId = new URLSearchParams(window.location.search).get("character");
    const character = getCharacter(requestedId);
    if (activeCharacterId !== character.id) {
      activeCharacterId = character.id;
      messages = loadConversation(character.id);
      chatError = "";
    }
    appView.innerHTML = renderChat(character);
    document.title = `Chat con ${character.name} | Charlas en alta mar`;
    renderMessages();
  } else if (!route) {
    appView.innerHTML = `
      <section class="info-panel" aria-labelledby="not-found-title">
        <h1 id="not-found-title" data-view-heading tabindex="-1">Página no encontrada</h1>
        <p class="page-description">La ruta que buscás no existe.</p>
        <a class="primary-link" href="/home" data-link>Volver al inicio</a>
      </section>
    `;
    document.title = "Página no encontrada | Charlas en alta mar";
  } else {
    appView.innerHTML = route.content;
    document.title = route.title;
  }

  document.querySelectorAll(".site-nav a").forEach((link) => {
    if (link.pathname === path || (path === "/chat" && link.pathname === "/chat")) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  appView.querySelector("[data-view-heading]")?.focus({ preventScroll: true });
}

function renderChat(character) {
  return `
    <section class="chat-panel" aria-labelledby="character-name">
      <div class="character-header">
        <div class="character-avatar" aria-hidden="true">${character.avatar}</div>
        <div class="character-details">
          <h1 id="character-name" data-view-heading tabindex="-1">${character.name}</h1>
          <p><span class="status-dot" aria-hidden="true"></span> En cubierta</p>
        </div>
        <span class="compass-mark" aria-hidden="true">✥</span>
      </div>
      <div class="history-toolbar">
        <p class="history-status" role="status"></p>
        <button class="clear-history" type="button">Borrar historial</button>
      </div>
      <div class="message-list" aria-label="Conversación" aria-live="polite" aria-relevant="additions">
        <p class="conversation-date">COMIENZA LA AVENTURA</p>
      </div>
      <form class="message-form">
        <label class="visually-hidden" for="message-input">Escribí tu mensaje</label>
        <input id="message-input" name="message" type="text" placeholder="Escribí tu mensaje..." autocomplete="off" />
        <button type="submit" aria-label="Enviar mensaje"><span aria-hidden="true">➤</span></button>
      </form>
      <p class="chat-note">
        Presioná Enter para enviar. ${character.name} puede tardar un momento en responder.
      </p>
      <p class="chat-error" role="alert" hidden></p>
    </section>
  `;
}

function renderMessages() {
  const messageList = appView.querySelector(".message-list");
  if (!messageList) {
    return;
  }
  const isCurrentChatSending =
    isSendingMessage && sendingCharacterId === activeCharacterId;

  const historyStatus = appView.querySelector(".history-status");
  if (historyStatus) {
    historyStatus.textContent = historyError
      ? "Historial no disponible"
      : hasSavedHistory
        ? "Historial guardado en este dispositivo"
        : "Todavía no hay historial guardado";
    historyStatus.dataset.saved = String(hasSavedHistory && !historyError);
  }

  messageList.querySelectorAll(".message").forEach((message) => message.remove());
  messageList.querySelector(".typing-indicator")?.remove();

  messages.forEach(({ role, text, sentAt }) => {
    const article = document.createElement("article");
    article.className = `message message-${role}`;

    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    article.append(paragraph);

    if (role === "character") {
      const copyButton = document.createElement("button");
      copyButton.className = "message-copy";
      copyButton.type = "button";
      copyButton.textContent = "Copiar";
      copyButton.setAttribute("aria-label", "Copiar respuesta");
      article.append(copyButton);
    }

    const time = document.createElement("time");
    const formattedTime = formatMessageTime(sentAt);
    time.dateTime = formattedTime.dateTime;
    time.textContent = formattedTime.label;
    article.append(time);
    messageList.append(article);
  });

  if (isCurrentChatSending) {
    const typingIndicator = document.createElement("p");
    typingIndicator.className = "typing-indicator";
    typingIndicator.setAttribute("role", "status");
    typingIndicator.append(`${characters[sendingCharacterId].name} está escribiendo `);
    const dots = document.createElement("span");
    dots.className = "typing-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.textContent = "•••";
    typingIndicator.append(dots);
    messageList.append(typingIndicator);
  }

  const errorMessage = appView.querySelector(".chat-error");
  if (errorMessage) {
    const errors = [chatError, historyError].filter(Boolean);
    errorMessage.textContent = errors.join(" ");
    errorMessage.hidden = errors.length === 0;
  }

  const clearButton = appView.querySelector(".clear-history");
  if (clearButton instanceof HTMLButtonElement) {
    clearButton.disabled = isCurrentChatSending;
  }

  const form = appView.querySelector(".message-form");
  if (form instanceof HTMLFormElement) {
    form.querySelectorAll("input, button").forEach((control) => {
      control.disabled = isCurrentChatSending;
    });
  }

  messageList.scrollTop = messageList.scrollHeight;
}

function updateThemeToggle() {
  const themeToggle = document.querySelector(".theme-toggle");
  if (!themeToggle) {
    return;
  }

  const label = isLightTheme ? "Activar modo oscuro" : "Activar modo claro";
  document.documentElement.dataset.theme = isLightTheme ? "light" : "dark";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
  themeToggle.querySelector("span").textContent = isLightTheme ? "☾" : "☼";
}

document.addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const clearButton = event.target.closest(".clear-history");
  if (clearButton) {
    if (isSendingMessage && sendingCharacterId === activeCharacterId) {
      return;
    }

    try {
      clearSavedConversation(window.localStorage, activeCharacterId);
      messages.splice(0, messages.length, createGreeting(activeCharacterId));
      hasSavedHistory = false;
      historyError = "";
      chatError = "";
    } catch (error) {
      historyError =
        error instanceof Error ? error.message : "No se pudo borrar el historial guardado.";
    }
    renderMessages();
    return;
  }

  const themeToggle = event.target.closest(".theme-toggle");
  if (themeToggle) {
    isLightTheme = !isLightTheme;
    updateThemeToggle();
    try {
      saveSavedTheme(window.localStorage, isLightTheme);
    } catch (error) {
      console.warn(
        "No se pudo guardar el tema:",
        error instanceof Error ? error.message : error,
      );
    }
    return;
  }

  const copyButton = event.target.closest(".message-copy");
  if (!copyButton) {
    return;
  }

  const message = copyButton.closest(".message");
  const text = message?.querySelector("p")?.textContent;
  const errorMessage = appView.querySelector(".chat-error");

  if (!text || !errorMessage) {
    return;
  }

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Tu navegador no permite copiar desde esta página.");
    }
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copiado";
    window.setTimeout(() => {
      if (copyButton.isConnected) {
        copyButton.textContent = "Copiar";
      }
    }, 1500);
    errorMessage.textContent = "";
    errorMessage.hidden = true;
  } catch (error) {
    errorMessage.textContent =
      error instanceof Error ? error.message : "No se pudo copiar la respuesta.";
    errorMessage.hidden = false;
  }
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const link = event.target.closest("a[data-link]");
  if (
    !link ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const destination = new URL(link.href);
  if (destination.origin !== window.location.origin) {
    return;
  }

  event.preventDefault();
  if (
    destination.pathname !== window.location.pathname ||
    destination.search !== window.location.search
  ) {
    window.history.pushState(null, "", `${destination.pathname}${destination.search}${destination.hash}`);
  }
  renderRoute();
});

document.addEventListener("submit", async (event) => {
  if (event.target instanceof HTMLFormElement && event.target.matches(".message-form")) {
    event.preventDefault();

    const input = event.target.elements.namedItem("message");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const text = input.value.trim();
    if (!text) {
      return;
    }

    if (isSendingMessage) {
      return;
    }

    const conversation = messages;
    const characterId = activeCharacterId;
    conversation.push({ role: "user", text, sentAt: Date.now() });
    input.value = "";
    chatError = "";
    isSendingMessage = true;
    sendingCharacterId = characterId;
    renderMessages();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildChatRequest(characterId, conversation)),
      });
      const responseText = await response.text();
      let data = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(`El servidor devolvió una respuesta inválida (HTTP ${response.status}).`);
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error || `El servidor no pudo responder (HTTP ${response.status}).`,
        );
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("La respuesta recibida no tiene un formato válido.");
      }

      conversation.push({ role: "character", text: data.reply.trim(), sentAt: Date.now() });
      try {
        saveConversation(window.localStorage, conversation, characterId);
        if (activeCharacterId === characterId) {
          hasSavedHistory = true;
          historyError = "";
        }
      } catch (error) {
        if (activeCharacterId === characterId) {
          historyError =
            error instanceof Error ? error.message : "No se pudo guardar el historial.";
        }
      }
    } catch (error) {
      conversation.pop();
      if (activeCharacterId === characterId) {
        input.value = text;
        chatError =
          error instanceof Error
            ? error.message
            : "Ocurrió un error al enviar el mensaje.";
      }
    } finally {
      isSendingMessage = false;
      sendingCharacterId = null;
      if (activeCharacterId === characterId) {
        messages = conversation;
      }
      renderMessages();
      if (appView.contains(input)) {
        input.focus();
      }
    }
  }
});

window.addEventListener("popstate", renderRoute);

if (window.location.pathname === "/") {
  window.history.replaceState(null, "", "/home");
}

renderRoute();
updateThemeToggle();

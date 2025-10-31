import { ImapFlow, FetchMessageObject } from "imapflow";
import { simpleParser, ParsedMail, AddressObject } from "mailparser";

let client: ImapFlow;
let reconnecting = false;

async function connectMail() {
  if (client && client.authenticated) {
    console.log("🔄 Cliente IMAP ya está conectado.");
    return;
  }

  console.log("📡 Conectando al servidor IMAP...");

  client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: "assistancefrankleo@gmail.com",
      pass: "yxpbmmeywsvhfqoc",
    },
    logger: false, // puedes cambiar a console si quieres ver logs
  });

  client.on("error", (err) => {
    console.error("❌ Error IMAP:", err.message);
    if (err.message.includes("Socket timeout")) {
      handleReconnect();
    }
  });

  client.on("close", () => {
    console.warn("⚠️ Conexión IMAP cerrada. Intentando reconectar...");
    handleReconnect();
  });

  await client.connect();
  await client.mailboxOpen("INBOX");
  console.log("✅ Conectado y escuchando correos...");

  client.on("exists", handleNewMessage);
}

async function handleReconnect() {
  if (reconnecting) return; // evita reconexiones múltiples
  reconnecting = true;

  console.log("🔁 Reintentando conexión en 5 segundos...");
  setTimeout(async () => {
    try {
      if (client) await client.logout().catch(() => {});
    } catch {}
    client = null as any;
    await connectMail();
    reconnecting = false;
  }, 5000);
}

async function handleNewMessage() {
  if (!client || !client.mailbox) {
    console.log("⚠️ Mailbox no está abierto todavía.");
    return;
  }

  const total = client.mailbox.exists;
  if (total === 0) return;

  const message = (await client.fetchOne(total, { source: true })) as
    | FetchMessageObject
    | false;

  if (!message || !("source" in message)) return;

  const parsed = await simpleParser(message.source as any);
  const subject = parsed.subject || "";
  const from = parsed.from?.text || "";

  console.log(`📩 Nuevo mensaje recibido: ${subject} (de ${from})`);

  const searchResults = await client.search({ subject });
  if (!searchResults || searchResults.length === 0) return;

  let targetUID: number;
  if (searchResults.length >= 3) {
    targetUID = searchResults[searchResults.length - 2];
  } else {
    targetUID = searchResults[searchResults.length - 1];
  }

  const targetMsg = (await client.fetchOne(targetUID, {
    source: true,
  })) as FetchMessageObject | false;

  if (!targetMsg || !("source" in targetMsg)) return;

  const targetParsed = await simpleParser(targetMsg.source as any);
  const sender = targetParsed.from?.text || "(remitente desconocido)";
  const bodyPreview =
    targetParsed.text?.trim().slice(0, 250) || "(sin contenido)";

  console.log("📨 Mensaje objetivo encontrado:");
  console.log(`De: ${sender}`);
  console.log(`Asunto: ${targetParsed.subject}`);
  console.log(`Cuerpo (previo): ${bodyPreview}`);
}

// Mantener la conexión viva

export { connectMail };

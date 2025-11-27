import { transporterGhostConfig } from '@/config/smtp';
import Imap, { ImapMessage, ImapFetch } from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import {
  ISVALID_NOTIFICATION_SUBJECT,
  DOMAINS_NOT_ALLOWED,
  REPORTS_KEY,
  NOTIFICATION_REMINDER,
  PARSE_CONSOLIDADO,
  DPTOS_CREDIT
} from '@/constants';
import { GET_PENDING_PREALERT_NOTIFICATION, CONFIRM_DESCRIPTION_PRE_ALERT, GET_NOTIFICATION_PREALERT } from '@/controllers/notification/preAlert';
import { UPDATE_ETA_PRE_ALERTS } from '@/controllers/notification/preAlert';
import { sendNotificationError, sendReport } from '@/imap';
import dayjs from "dayjs";
import xml2js from 'xml2js';
import xmlParser from '@/data/parse';
import isOnline from 'is-online';
import { ANALYZE_TEXT, LAST_MESSAGE_TEXT } from '@/controllers/openIA';
import dotenv from "dotenv";
import { CREATE_ARRIVAL_NOTICE, UPDATE_ARRIVAL_RESPONSE } from '@/controllers/notification/arrivalNotice';
import { uploadPdfFromBuffer } from '@/controllers/supebase';

dotenv.config();

const imapConfig: Imap.Config = transporterGhostConfig;
let imap: Imap | null = null;

const cmdDate = new Date().toLocaleTimeString();

let reconnectTimer: NodeJS.Timeout | null = null;
let isConnecting = false;
let hasInternet = true;

async function connectImap() {
  if (isConnecting) return;
  isConnecting = true;

  const online = await isOnline();

  if (!online) {
    if (hasInternet) console.log("Internet connection lost.");
    hasInternet = false;
    scheduleReconnect(10000);
    isConnecting = false;
    return;
  }

  if (!hasInternet) console.log("Internet reconnected.");
  hasInternet = true;
  console.log("📡 Connecting to IMAP...");

  imap = new Imap(imapConfig);

  imap.once("ready", () => {

    imap?.getBoxes((error, boxes) => {
      console.log("Boxes:",);
    })

    console.log("IMAP connected successfully.");
    openInbox();
    isConnecting = false;
  });

  imap.once("error", (err) => {
    console.error("⚠️ IMAP error:", err.message);
    scheduleReconnect(10000);
    isConnecting = false;
  });

  imap.once("close", (hadError) => {
    console.warn("IMAP connection closed", hadError ? "(with error)" : "(normal)");
    imap = null;
    scheduleReconnect(10000);
  });

  try {
    imap.connect();
  } catch (err: any) {
    console.error("Failed to start IMAP connection:", err.message);
    scheduleReconnect(10000);
    isConnecting = false;
  }
}

function scheduleReconnect(ms: number) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectImap, ms);
}

function openInbox() {
  if (!imap) return;
  imap.openBox("[Gmail]/Todos", false, (err, box) => {
    if (err) throw err;
    console.log("📥 IMAP inbox opened at", cmdDate);

    imap!.on("mail", () => fetchNewMessages(box));
    imap!.on("update", () => fetchNewMessages(box));
  });
}

function fetchNewMessages(box: Imap.Box) {
  const dynamicSince = new Date().toUTCString();
  const searchCriteria = ['UNSEEN', ['SINCE', dynamicSince]];

  imap!.search(searchCriteria, (err, results) => {
    if (err || !results || !results.length) return;

    const f: ImapFetch = imap!.fetch(results, { bodies: '', struct: true });

    f.on('message', async (msg: ImapMessage) => await processMessage(msg));
    f.once('error', (err) => console.error('Error fetch:', err));
  });
}

async function processMessage(msg: ImapMessage) {
  let uid: number | null = null;
  const allChunks: Buffer[] = [];

  msg.once("attributes", (attrs) => {
    uid = attrs.uid;
  });

  msg.on("body", (stream) => {
    stream.on("data", (chunk: Buffer) => {
      allChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", (err: Error) => {
    });
  });

  msg.once("end", async () => {
    if (allChunks.length === 0) return;

    const raw = Buffer.concat(allChunks);
    const parsed: ParsedMail = await simpleParser(raw);

    const subject = parsed.subject || "";
    const body = parsed.text || "";
    const sender = parsed.from?.text || "(remitente desconocido)";

    const type = subject.includes("PRE-ALERTA")
      ? "PRE_ALERT"
      : subject.includes("AVISO DE LLEGADA")
        ? "ARRIVAL_NOTICE"
        : "";

    const file = {
      name: parsed?.attachments?.[0]?.filename,
      content: parsed?.attachments?.[0]?.content
        ? (Buffer.isBuffer(parsed.attachments[0].content)
          ? parsed.attachments[0].content.toString("utf8")
          : String(parsed.attachments[0].content))
        : "",
    };

    const isXmlFile = file.name?.endsWith(".xml");
    const isAttachment = parsed.attachments && parsed.attachments.length > 0;
    const isReply = subject.toLowerCase().startsWith("re:");

    const hasNotificationKeyword = ISVALID_NOTIFICATION_SUBJECT(subject);
    const hasNotificationReminder = NOTIFICATION_REMINDER.some(
      (key) => subject.includes(key.toUpperCase())
    );

    const hasReportKey = REPORTS_KEY.some(
      (key) => subject.includes(key.toUpperCase()) || body.includes(key.toUpperCase())
    );

    // 1️⃣ WAITING FOR FILES XML
    if (hasNotificationKeyword && isXmlFile && isAttachment) {
      try {
        
        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const xmlInfo = await parser.parseStringPromise(file.content);
        
        /**  */
        const nameOfFile = file?.name?.split(".")[0] || "";
        const exists = await GET_NOTIFICATION_PREALERT(nameOfFile);
        
        if (exists) {
          if (uid) removeFlags(uid);
          return;
        };
        
        console.log("✅ Processing XML:", subject);

        await xmlParser(xmlInfo, type);

        if (uid) removeFlags(uid);
      } catch (err) {
        console.error("❌ Error processing XML:", err);
      }
    };

    /** 
    if (subject.includes("Consol")) {
      const consol = PARSE_CONSOLIDADO(subject);

      await CREATE_ARRIVAL_NOTICE({
        consol: consol?.[1] || "",
        ataAt: new Date(),
      });
    }
      */

    //WORKING
    if (subject.includes("SOLICITUD DE LIBERACIÓN // BL SNTG25058137")) {
      function cleanBody(texto: string) {
        return texto
          .split("\n")
          .filter(line => !line.includes(">"))
          .join("\n")
          .trim();
      }

      const text = cleanBody(body);
      const lastMessage = await LAST_MESSAGE_TEXT(text);
      if (!lastMessage.mensaje) return;

      const analyze = await ANALYZE_TEXT(lastMessage.mensaje);
      if (analyze.estado) {
        if (uid) removeFlags(uid);
      }
    }

    // 2️⃣ WAITING FOR RESPONSE PRE-ALERTS

    if (hasNotificationReminder && isReply) {
      const allNotifications = await GET_PENDING_PREALERT_NOTIFICATION();
      const senderIsAllowed = !DOMAINS_NOT_ALLOWED.some((domain) =>
        sender.includes(domain)
      );

      console.log("senderIsAllowed", senderIsAllowed);
      if (!Array.isArray(allNotifications) || allNotifications.length === 0) return;
      if (!senderIsAllowed) {
        if (uid) markAsRead(uid);
        return
      };

      const dateReceived = new Date(parsed?.date as Date)?.toISOString();
      const uniqueNotifications = Array.from(
        new Map(allNotifications.map((n: any) => [n.id, n])).values()
      );


      await Promise.all(
        uniqueNotifications.map(async (notification) => {
          function cleanBody(texto: string) {
            return texto
              .split("\n")
              .filter(line => !line.includes(">"))
              .join("\n")
              .trim();
          };

          const text = cleanBody(body);
          const lastMessage = await LAST_MESSAGE_TEXT(text);

          const messageKey = await CONFIRM_DESCRIPTION_PRE_ALERT({
            subject: notification.subject,
            answeredBy: sender,
            description: lastMessage.mensaje,
            answeredAt: dateReceived,
          });
          console.log("✅ Notification updated:", messageKey);
        })
      );

      if (uid) markAsRead(uid);
    }

    // 3️⃣  WAITING FOR UPDATES ETA
    const consol = PARSE_CONSOLIDADO(subject);
    if (consol && consol[0] === "ETA") {
      await UPDATE_ETA_PRE_ALERTS({
        consol: consol[1],
        etaAt: body,
      });

      if (uid) removeFlags(uid);
    };

    // 5️⃣ MARK AS READ
    if (subject.includes("[INTERNO]")) {
      const parts = subject.split("//").map(part => part.trim());
      const shipment = parts[parts.length - 1];

      const emailMatch = sender.match(/<(.+)>/);
      const email = emailMatch ? emailMatch[1] : null;

      const smtpEmail = String(process.env.SMTP_EMAIL);
      if (!email || email === smtpEmail) {
        if (uid) removeFlags(uid);
        return;
      };

      function cleanBody(texto: string) {
        return texto
          .split("\n")
          .filter(line => !line.includes(">"))
          .join("\n")
          .trim();
      };

      const text = cleanBody(body);
      const lastMessage = await LAST_MESSAGE_TEXT(text);
      const analyze = await ANALYZE_TEXT(lastMessage.mensaje);
      const status = analyze.estado === "ACEPTADO";

      const response = await UPDATE_ARRIVAL_RESPONSE({
        email,
        shipment,
        status
      });

      if (response) {
        if (uid) removeFlags(uid);
      }
    }

    // 4️⃣ REPORTS
    if (hasReportKey) {
      const reportNotification = await sendReport({
        to: sender,
        subject: `Re: ${subject}`,
        messageId: uid?.toString() || "",
      });

      console.log("✅Report notification:", reportNotification, cmdDate);
      if (uid) markAsRead(uid);
    }
  });



  function markAsRead(uid: number) {
    imap!.addFlags(uid, ["\\Seen"], (err) => {
      if (err) console.error(err);
    });
  }

  function removeFlags(uid: number) {
    if (uid) {
      imap!.move(uid.toString(), '[Gmail]/Papelera', (err) => {
        if (err) console.error("❌ Error removing flags:", err);
      });
    }
  }
}

async function getAttachmentsBySubject(targetSubject: string) {
  return new Promise<{ filename: string; content: Buffer }[]>((resolve, reject) => {
    const imap = new Imap(imapConfig);
    const pdfAttachments: { filename: string; content: Buffer }[] = [];

    console.log("Conectando IMAP...");

    imap.once("ready", () => {
      console.log("IMAP listo");

      imap.openBox("[Gmail]/Todos", false, (err) => {
        if (err) return reject(err);

        const today = dayjs().format("DD-MMM-YYYY");
        const searchCriteria = ["UNSEEN", ["ON", today]];
        const fetchOptions = { bodies: "" }; // leer todo el MIME

        console.log("Buscando correos:", searchCriteria);

        imap.search(searchCriteria, (err, results) => {
          if (err) return reject(err);

          console.log("Resultados de búsqueda:", results);

          if (!results || results.length === 0) {
            console.log("No hay correos");
            imap.end();
            return resolve([]);
          }

          const f = imap.fetch(results, fetchOptions);

          f.on("message", (msg, seqno) => {
            console.log(`📩 Procesando mensaje #${seqno}`);

            let fullBody: Buffer[] = [];
            let totalBytes = 0;

            msg.on("body", (stream) => {
              stream.on("data", (chunk) => {
                fullBody.push(chunk);
                totalBytes += chunk.length;
              });
            });

            msg.once("end", async () => {
              console.log(`Fin mensaje #${seqno}, tamaño: ${totalBytes} bytes`);

              if (totalBytes === 0) return;

              try {
                const fullMime = Buffer.concat(fullBody);
                const parsed = await simpleParser(fullMime);

                // -------- FIX DEFINITIVO 🔥 ----------
                const clean = (str: string) =>
                  str.replace(/\s+/g, " ").trim().toUpperCase();

                const subjectClean = clean(parsed.subject || "");
                const targetClean = clean(targetSubject);

                console.log("Subject limpio:", subjectClean);
                console.log("Target limpio:", targetClean);

                if (!subjectClean.includes(targetClean)) {
                  console.log("❌ El subject NO coincide. Se ignora este correo.");
                  return;
                }

                console.log("✔ Subject coincide. Adjuntos encontrados:", parsed.attachments.length);

                for (const att of parsed.attachments) {
                  if (att.filename?.toLowerCase().endsWith(".pdf")) {
                    console.log(`✔ Agregando PDF: ${att.filename} (${att.content.length} bytes)`);

                    pdfAttachments.push({
                      filename: att.filename,
                      content: att.content,
                    });
                  } else {
                    console.log(`Adjunto ignorado: ${att.filename}`);
                  }
                }

              } catch (err) {
                console.error("Error al parsear MIME:", err);
              }
            });

            msg.once("attributes", (attrs) => {
              imap.addFlags(attrs.uid, ["\\Seen"], () => { });
            });
          });

          f.once("error", (err) => {
            console.error("Error en fetch:", err);
            reject(err);
          });

          f.once("end", () => {
            console.log("✔ Finalizó fetch. Cerrando IMAP...");
            imap.end();
          });
        });
      });
    });

    imap.once("error", (err) => {
      console.error("Error IMAP:", err);
      reject(err);
    });

    imap.once("end", () => {
      console.log("IMAP cerrado. Total PDFs:", pdfAttachments.length);
      resolve(pdfAttachments);
    });

    imap.connect();
  });
}

setInterval(async () => {
  const online = await isOnline();

  if (!online && hasInternet) {
    console.log("Internet disconnected.");
    hasInternet = false;
  } else if (online && !hasInternet) {
    console.log("Internet restored.");
    hasInternet = true;
    connectImap();
  }
}, 5000);

export { getAttachmentsBySubject }
connectImap();
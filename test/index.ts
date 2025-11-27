import path from 'path';
import fs from 'fs';
import xml2js from 'xml2js';
import xmlParser from '@/data/parse';
import template from "@/html/imap/templates/index";
import { Request, Response } from 'express';
import { transporterSender, transporterSenderProduction } from '@/config/smtp';
import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient();

async function fileTest() {
    const file = "./test/SIA25116017.xml";

    try {
        const filePath = path.resolve(file);
        const xmlContent = fs.readFileSync(filePath, 'utf8');

        const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
        const parsedData = await parser.parseStringPromise(xmlContent);

        return parsedData;
    } catch (error) {
        console.error(error);
    }
}

async function notificationTest(req: Request, res: Response) {
    const body = req.body;

    if (!body.email) {
        return res.status(400).json({ error: "Email is required" });
    }

    const data = await xmlParser('', 'PRE_ALERT');

    const type = (data.type === "PRE_ALERT" ? "Pre-Alerta" : "Aviso de Llegada").toUpperCase();
    const transport = (data.type !== "PRE_ALERT" ?
        (data.shipment.transportMode === "SEA" ? " // MARITIMO " : " // AEREO ").toUpperCase() : "");
    const mode = (data.type === "PRE_ALERT" ? "" : ` // ${data.shipment.packingMode}`).toUpperCase();

    const subject = `${type}${transport}${mode} // ${data.agent.consignee.name}  // ${data.shipment.shipmentNumber} // ${data.shipment.operation}`;
/** 
    const pdfs = await waitForAttachments("DOCUMENTOS SIS250813566");

    if (!pdfs || pdfs.length === 0) {
        await sendNotificationError('No se encontraron archivos PDF.');
        return;
    }
*/
    try {
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: body.email,
            cc: ["jahazielmartinez80@gmail.com", "assistancefrankleo@gmail.com"],
            replyTo: process.env.SMTP_BCC,
            subject: subject,
            html: await template(data),
            attachments: [
                {
                    filename: 'frankleo.png',
                    path: path.join(process.cwd(), "public", "frankleo.png"),
                    cid: 'logoFrankleo',
                },
               
            ],
        };

        const message = await transporterSender.sendMail(mailOptions);
        const messageId = message.messageId;

        return res.status(200).json({ message: messageId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to send message" });
    }
}

async function messageTest(req: Request, res: Response) {
    const body = req.body;

    if (!body.email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const mailOptions = {
            from: 'notificaciones@frankleo.com',
            to: body.email,
            cc: "jahazielmartinez80@gmail.com",
            bcc: process.env.SMTP_BCC,
            replyTo: process.env.SMTP_BCC,
            subject: body.subject || "Test Message",
            text: body.message || "This is a test message",
        };

        const info = await transporterSenderProduction.sendMail(mailOptions);
        const originalMessageId = info.messageId;

        return res.status(200).json({ message: originalMessageId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to send message" });
    }
}

async function reportTest(req: Request, res: Response) {
    /**
    try {
        const notifications = await prisma.notification.findMany({});
        if (!notifications || notifications.length === 0) {
            return null;
        };

        const timeZone = {
            timeZone: "America/Santo_Domingo",
        };

        const notificationsUpdated = notifications.map((notification) => {
            return {
                id: String(notification.id).padStart(3, "0"),
                shipmentId: notification.shipmentId,
                subject: notification.subject,
                recipient: `TO:[${notification.recipient}]  CC:[${notification.recipientCc}]`,
                retries: notification.retries,
                isAnswered: notification.isAnswered ? "YES" : "NO",
                answeredBy: notification.answeredBy,
                answeredAt: notification.answeredAt
                    ? new Date(notification.answeredAt)?.toLocaleString("es-ES", timeZone) : "",
            }
        });

        const htmlContent = template(notificationsUpdated);

        const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({ format: "A4", landscape: true });
        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=reporte.pdf");
        res.send(pdfBuffer);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
         */
}

export { fileTest, notificationTest, messageTest, reportTest };

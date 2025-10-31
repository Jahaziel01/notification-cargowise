import path from 'path';
import fs from 'fs';
import xml2js from 'xml2js';
import { ImapFlow } from 'imapflow';
import { Request, Response } from 'express';
import { transporter } from '../config/nodemail';

async function fileTest() {
    const file = "./test/SIS251013960.xml";

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

async function messageTest(req: Request, res: Response) {
    const body = req.body;

    if (!body.email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // 1️⃣ Enviar el correo
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: body.email,
            replyTo: process.env.SMTP_BCC,
            cc: "jahazielmartinez80@gmail.com",
            bcc: process.env.SMTP_BCC,
            subject: "Test Message",
            text: body.message || "This is a test message",
        };

        const info = await transporter.sendMail(mailOptions);
        const originalMessageId = info.messageId; // <-- guardamos Message-ID
        console.log("📨 Correo enviado con Message-ID:", originalMessageId);

       
        return res.status(200).json({ message: originalMessageId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to send message" });
    }
}

export { fileTest, messageTest };

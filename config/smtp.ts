import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import dotenv from "dotenv";

dotenv.config();

export const transporterSender = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});
export const transporterSenderProduction = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: 587,
    secure: false,
    auth: {
        user: 'notificaciones@frankleo.com',
        pass: 'N/814019030802ox',
    },
});

export const transporterGhostConfig = {
    user: process.env.HOST_EMAIL as string,
    password: process.env.HOST_PASSWORD as string,
    host: process.env.HOST_SERVER as string,
    port: Number(process.env.HOST_PORT as string),
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 15000,
};

export const imapConfigSimple = {
    imap: {
        user: process.env.HOST_EMAIL as string,
        password: process.env.HOST_PASSWORD as string,
        host: process.env.HOST_SERVER as string,
        port: Number(process.env.HOST_PORT as string),
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 15000,
    },
};
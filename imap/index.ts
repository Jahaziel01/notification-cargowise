import path from "path";
import { transporterSender } from '@/config/smtp';
import { transporterSenderProduction } from '@/config/smtp';
import template from '@/html/imap/templates/index';
import templateUpdate from '@/html/imap/templates/update';
import { GET_NOTIFICATION_PREALERT, CREATE_PRE_ALERT } from '@/controllers/notification/preAlert';
import { getAttachmentsBySubject } from "@/imap/ghost";
import { MAIL_ERROR, INTERNAL_MAIL, DPTOS_CREDIT } from '@/constants';
import templateAccounting from "@/html/imap/templates/accounting";
import templateLogistics from "@/html/imap/templates/logistics";
import templateRelease from "@/html/imap/templates/release";

interface SendNotificationInput {
    to: string;
    subject: string;
    messageId: string;
}

interface SendNotificationOutput {
    messageId: string;
    subject: string;
}

async function sendNotification(data: any): Promise<SendNotificationOutput | undefined> {
    if (data.type === "PRE_ALERT") {
        const exists = await GET_NOTIFICATION_PREALERT(data.shipment.operation)
        if (exists) return;
    };

    const type = (data.type === "PRE_ALERT" ? "Pre-Alerta" : "Aviso de Llegada").toUpperCase();
    const transport = (data.shipment.transportMode === "SEA" ? " // MARITIMO " : " // AEREO ").toUpperCase();
    const mode = (data.shipment.packingMode).toUpperCase();

    const subject = `${type}${transport} // ${mode} // ${data.shipment.incoterms} // ${data.agent.consignee.name} // ${data.shipment.shipmentNumber} // ${data.shipment.operation}`;

    const subjectDoc = `DOCUMENTS ${data.type} ${data.shipment.operation}`?.toUpperCase();

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await wait(60_000);
    const pdfs = await getAttachmentsBySubject(subjectDoc);

    let ccMails = [];
    if (data.shipment.transportMode === "AIR") {
        ccMails.push("ediaz@frankleo.com", "harias@frankleo.com", "drodriguez@frankleo.com", "vcoste@frankleo.com", "traffic@frankleo.com, assistancefrankleo@gmail.com");
    }

    if (data.shipment.transportMode === "SEA") {
        ccMails.push("traffic@frankleo.com", "import@frankleo.com, assistancefrankleo@gmail.com");
    }

    if (data.shipment.transportMode === "SEA" && data.shipment.aduanasAllow) {
        ccMails.push("teamaduanas@frankleo.com", "jparedes@frankleo.com", "omorban@frankleo.com", "sbello@frankleo.com", "ybatista@frankleo.com", "jpineda@frankleo.com")
    }

    const fakeTo = ["jmartinez@frankleo.com", "jmartinez@frankleo.com", "jmartinez@frankleo.com", "jmartinez@frankleo.com"];
    const fakeCC = ["jahazielmartinez80@gmail.com", "jahazielmartinez80@gmail.com"];

    try {
        const mailOptions = {
            from: 'notificaciones@frankleo.com',
            to: data.recipientList,
            cc: ccMails,
            subject: subject,
            html: await template(data),
            attachments: [
                {
                    filename: 'frankleo.png',
                    path: path.join(process.cwd(), "public", "frankleo.png"),
                    cid: 'logoFrankleo',
                },
                ...pdfs
            ],
        };

        const info = await transporterSenderProduction.sendMail(mailOptions);
        if (!info.messageId) return;

        if (data.type === "PRE_ALERT") {
            const notification = await CREATE_PRE_ALERT({
                messageKey: info.messageId,
                shipment: data.shipment.operation,
                subject: subject,
                recipients: data.recipientList.join(", "),
                cc: ccMails.join(", "),
                user: data.agent.user,
                etaAt: data.shipment.etaAt,
                consol: data.shipment.consol,
                json: data,
            });
            console.log('pre_alert_created:', notification?.messageKey);
        }

        return {
            messageId: info.messageId,
            subject: subject,
        };

    } catch (error) {
        console.error(error);
    }
};

async function sendUpdatePreAlert(data: any): Promise<string | undefined> {
    try {
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: data.recipients,
            cc: INTERNAL_MAIL,
            bcc: process.env.SMTP_BCC,
            subject: "Re: " + data.subject,
            html: templateUpdate(data),
            inReplyTo: data.messageId,
            references: [data.messageId],
            attachments: [
                {
                    filename: 'frankleo.png',
                    path: path.join(process.cwd(), "public", "frankleo.png"),
                    cid: 'logoFrankleo',
                },
            ],
        };

        const info = await transporterSender.sendMail(mailOptions);
        return info.messageId;
    } catch (error) {
        console.error(error);
    }
}

async function sendNotificationReleaseAccounting(data: any): Promise<string | undefined> {
    const subject = `[INTERNO] // ACCOUNTING // SOLICITUD DE LIBERACIÓN // ${data.json?.shipment.operation}`?.toUpperCase();
    try {
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: DPTOS_CREDIT[0],
            cc: INTERNAL_MAIL,
            subject: subject,
            html: templateAccounting(data),
            headers: {
                "Message-ID": `<${Math.random().toString(36).slice(2)}@frankleo.com>`
            },
            attachments: [
                {
                    filename: 'frankleo.png',
                    path: path.join(process.cwd(), "public", "frankleo.png"),
                    cid: 'logoFrankleo',
                },
            ],
        };

        const info = await transporterSender.sendMail(mailOptions);
        return info.messageId;

    } catch (error) {
        console.error(error);
    }
};

async function sendNotificationReleaseLogistics(data: any): Promise<string | undefined> {
    const subject = `[INTERNO] // OPERATIONS // SOLICITUD DE LIBERACIÓN // ${data.json?.shipment.operation}`?.toUpperCase();
    try {
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: DPTOS_CREDIT[1],
            cc: INTERNAL_MAIL,
            subject: subject,
            html: templateLogistics(data),
            headers: {
                "Message-ID": `<${Math.random().toString(36).slice(2)}@frankleo.com>`
            },
            attachments: [
                {
                    filename: 'frankleo.png',
                    path: path.join(process.cwd(), "public", "frankleo.png"),
                    cid: 'logoFrankleo',
                },
            ],
        };

        const info = await transporterSender.sendMail(mailOptions);
        return info.messageId;

    } catch (error) {
        console.error(error);
    }
};

async function sendResponseRelease(data: any): Promise<string | undefined> {
    try {
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: data.recipients,
            cc: INTERNAL_MAIL,
            bcc: process.env.SMTP_BCC,
            subject: "Re: " + data.subject,
            html: templateRelease(data),
            inReplyTo: data.messageId,
            references: [data.messageId],
            attachments: [
                {
                    filename: 'frankleo.png',
                    path: path.join(process.cwd(), "public", "frankleo.png"),
                    cid: 'logoFrankleo',
                },
            ],
        };

        const info = await transporterSender.sendMail(mailOptions);
        return info.messageId;
    } catch (error) {
        console.error(error);
    }
}

async function sendNotificationError(data: { subject: string, data: string }): Promise<void> {
    try {
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: MAIL_ERROR,
            subject: data.subject,
            text: data.data,
        };

        const info = await transporterSender.sendMail(mailOptions);
        console.log(`ErrorId: ${info.messageId}`);

    } catch (error) {
        console.error(error);
    }
};

async function sendReport({
    to,
    subject,
    messageId,
}: SendNotificationInput) {
    try {
        const reports = ""; //await REPORT();
        if (!reports) return;

        const mailOptions = {
            from: process.env.SMTP_EMAIL as string,
            to,
            subject,
            text: "Adjunto el reporte solicitado.",
            attachments: [
                {
                    filename: "reporte.pdf",
                    content: reports as Buffer,
                    contentType: "application/pdf",
                }
            ],
            inReplyTo: messageId,
            references: [messageId],
        };

        const result = await transporterSender.sendMail(mailOptions);
        return result?.messageId;

    } catch (error) {
        console.error(error);
    }
}

export {
    sendReport,
    sendNotification,
    sendUpdatePreAlert,
    sendResponseRelease,
    sendNotificationError,
    sendNotificationReleaseLogistics,
    sendNotificationReleaseAccounting,
};
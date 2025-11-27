import path from "path";
import cron from "node-cron";
import { transporterSender, transporterSenderProduction } from "@/config/smtp";
import templateReminder from "@/html/imap/templates/reminder";
import { GET_PENDING_PREALERT_NOTIFICATION, UPDATE_RETRIES_PRE_ALERT } from "@/controllers/notification/preAlert";

async function REMINDER_NOTIFICATION_PREALERT() {
    const notifications = await GET_PENDING_PREALERT_NOTIFICATION();
    if (!notifications || notifications.length === 0) return;

    await Promise.all(
        notifications.map(async (notification) => {
            const messageId = notification.messageKey;

            const recipientsArray = notification.recipients
                .split(",")
                .map(email => email.trim());

            const ccArray = notification.cc
                ? notification.cc.split(",").map(email => email.trim())
                : [];

            const mailOptions = {
                from: 'notificaciones@frankleo.com',
                to: recipientsArray,
                cc: ccArray,
                bcc: process.env.SMTP_BCC,
                subject: "Re: " + notification.subject,
                html: templateReminder(notification),
                inReplyTo: messageId,
                references: [messageId],
                attachments: [
                    {
                        filename: 'frankleo.png',
                        path: path.join(process.cwd(), "public", "frankleo.png"),
                        cid: 'logoFrankleo',
                    },
                ],
            };

            await UPDATE_RETRIES_PRE_ALERT(notification.id);
            await transporterSenderProduction.sendMail(mailOptions);
        })
    );
}

cron.schedule("0 8 * * *", async () => () => { }, {
    timezone: "America/Santo_Domingo",
});

cron.schedule("30 15 * * *", async () => () => { }, {
    timezone: "America/Santo_Domingo",
});

/**
cron.schedule("* * * * *", async () => await REMINDER_NOTIFICATION(), {
    timezone: "America/Santo_Domingo",
});
 */

//setInterval(REMINDER_NOTIFICATION_PREALERT, 4 * 60 * 1000);

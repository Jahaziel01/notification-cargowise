import { Request, Response } from 'express';
import { PrismaClient } from '@/generated/prisma/client';
import { GATEWAY_NOT_ALLOWED } from '@/constants';
import { safeDecode, diffInDays } from '@/constants/helpers';
import { sendUpdatePreAlert } from '@/imap';
import * as gateway from "default-gateway";
import ip from "ip";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import "dayjs/locale/es";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const prisma = new PrismaClient();

interface CreateNotificationInput {
    messageKey: string;
    shipment: string;
    subject: string;
    recipients: string;
    cc: string;
    consol?: string;
    user?: string;
    etaAt?: string;
    json?: unknown;
}

interface ConfirmDescriptionInput {
    subject: string;
    answeredBy: string;
    description: string;
    answeredAt: string;
}

interface UpdateETAInput {
    consol: string;
    etaAt: string;
}

async function GET_NOTIFICATION_PREALERT(shipment: string) {
    const notification = await prisma.preAlert.findFirst({
        where: {
            shipment: shipment,
        },
    });
    return !!notification?.shipment;
}

async function GET_PENDING_PREALERT_NOTIFICATION() {
    const notifications = await prisma.preAlert.findMany({
        where: {
            isAnswered: false,
            OR: [
                { description: "" },
                { description: null }
            ]
        },
    });

    return notifications.map(n => {
        const short = dayjs(n.createdAt).format("YYYY-MM-DD");
        const today = dayjs().format("YYYY-MM-DD");

        return {
            ...n,
            createdAt: {
                short,
                long: dayjs(n.createdAt).format("YYYY-MM-DD HH:mm:ss"),
                template: dayjs(n.createdAt).format("DD/MM/YYYY HH:mm:ss"),
            },
            diff: diffInDays(short, today),
        };
    });

};

async function GET_UPDATE_PRE_ALERT_NOTIFICATION({ consol }: { consol: string }) {
    try {
        const notifications = await prisma.preAlert.findMany({
            where: {
                consol: consol,
                closed: false,
            },
        });
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function GET_PENDING_PREALERT_NOTIFICATION_ROUTE(request: Request, response: Response) {
    const notifications = await GET_PENDING_PREALERT_NOTIFICATION();
    return response.status(200).json(notifications);
}

async function CREATE_PRE_ALERT(input: CreateNotificationInput) {
    const exists = await prisma.preAlert.findFirst({
        where: {
            shipment: input.shipment,
        },
    });

    if (exists?.shipment) return;

    try {
        const notification = await prisma.preAlert.create({
            data: {
                messageKey: input.messageKey,
                shipment: input.shipment,
                subject: input.subject,
                recipients: input.recipients,
                cc: input.cc,
                user: input.user,
                etaAt: input.etaAt,
                consol: input.consol as string,
                json: JSON.parse(JSON.stringify(input.json)),
            },
        });

        return {
            status: 201,
            messageKey: notification.messageKey,
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function CONFIRM_PRE_ALERT(request: Request, response: Response) {
    const id = request.params.id;
    const decoded = safeDecode(id);

    const privateIp = ip.address();
    const { gateway: gw } = await gateway.gateway4async();

    const isBlocked = GATEWAY_NOT_ALLOWED.some(blocked =>
        gw === blocked || gw.startsWith(blocked)
    );

    if (isBlocked) {
        const message = "lo siento, no tienes permiso para confirmar el pre-alerta.";
        return response.status(403).json({ message });
    }

    try {
        const exists = await prisma.preAlert.findFirst({
            where: {
                shipment: decoded as string,
            },
        });

        if (exists?.isAnswered) {
            const message = "lo sentimos, ya se confirmo el pre-alerta.";
            const date = new Date(exists?.answeredAt as Date)?.toLocaleString("es-ES", {
                timeZone: "America/Santo_Domingo",
            });
            return response.status(400).json({ message, date });
        }

        const notification = await prisma.preAlert.update({
            where: {
                shipment: decoded as string,
            },
            data: {
                isAnswered: true,
                answeredBy: privateIp,
                answeredAt: new Date(),
            },
        });

        if (notification.id) {
            return response.status(200).json({
                status: 200,
                messageKey: notification.messageKey,
            });
        }

        return response.status(400).json({});
    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function CONFIRM_DESCRIPTION_PRE_ALERT({
    subject,
    answeredBy,
    description,
    answeredAt,
}: ConfirmDescriptionInput) {
    try {
        const exists = await prisma.preAlert.findFirst({
            where: {
                subject: subject,
            },
        });

        if (!exists?.id || exists?.isAnswered) {
            return null;
        }

        const notification = await prisma.preAlert.update({
            where: {
                subject: subject,
            },
            data: {
                isAnswered: true,
                answeredBy: answeredBy,
                description: description,
                answeredAt: answeredAt,
            },
        });

        return notification.messageKey;

    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function UPDATE_RETRIES_PRE_ALERT(id: number) {
    try {
        const notification = await prisma.preAlert.update({
            where: {
                id: id,
            },
            data: {
                retries: {
                    increment: 1,
                },
            },
        });

        return !!notification.retries;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function UPDATE_ETA_PRE_ALERTS({
    consol,
    etaAt,
}: UpdateETAInput) {
    if (!etaAt) return;
    const formattedEtaAt = dayjs(etaAt).toISOString();

    const preAlerts = await prisma.preAlert.findMany({
        where: {
            consol,
            closed: false,
        },
    });

    if (!preAlerts || preAlerts.length === 0) return;

    await Promise.all(
        preAlerts.map(async (preAlert) => {
            const updated = await prisma.preAlert.update({
                where: {
                    id: preAlert.id,
                },
                data: {
                    etaAt: formattedEtaAt,
                    updates: {
                        increment: 1,
                    },
                },
            });

            const sendUpdate = await sendUpdatePreAlert(updated);
            console.log('update_prealert', sendUpdate);
        })
    );
}

export {
    UPDATE_ETA_PRE_ALERTS,
    GET_NOTIFICATION_PREALERT,
    GET_PENDING_PREALERT_NOTIFICATION_ROUTE,
    GET_PENDING_PREALERT_NOTIFICATION,
    CREATE_PRE_ALERT,
    CONFIRM_PRE_ALERT,
    CONFIRM_DESCRIPTION_PRE_ALERT,
    UPDATE_RETRIES_PRE_ALERT
};
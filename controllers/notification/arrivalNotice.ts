import { Request, Response } from 'express';
import * as gateway from "default-gateway";
import ip from "ip";
import { DPTOS_CREDIT, GATEWAY_NOT_ALLOWED } from '@/constants';
import { PrismaClient } from '@/generated/prisma/client';
import { sendNotification, sendNotificationReleaseAccounting, sendNotificationReleaseLogistics, sendResponseRelease } from '@/imap';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { dateFormater } from '@/constants/helpers';
import { safeDecode } from '@/constants/helpers';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const prisma = new PrismaClient();

interface CreateArrivalNoticeInput {
    consol: string;
    ataAt: string | Date | any;
}

interface UpdateArrivalNoticeInput {
    email: string;
    status: boolean;
    shipment: string;
}

async function GET_ATA_ARRIVAL_NOTICE({ shipment }: { shipment: string }): Promise<string> {
    try {
        const arrival = await prisma.arrivalNotice.findFirst({
            where: {
                shipment: shipment,
            },
        });

        return arrival?.ataAt ? dateFormater(new Date(arrival.ataAt)) : "";
    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function CREATE_ARRIVAL_NOTICE({ consol, ataAt }: CreateArrivalNoticeInput) {
    const formattedAtaAt = dayjs(ataAt).toISOString();
    try {
        const exists = await prisma.preAlert.findMany({
            where: {
                consol: consol,
                closed: false,
            },
        });

        if (!exists || exists.length === 0) return;

        const createdArrivals = await Promise.all(
            exists.map(async (preAlert) => {
                let arrival = await prisma.arrivalNotice.findFirst({
                    where: {
                        shipment: preAlert.shipment,
                    },
                });

                if (!arrival?.id) {
                    arrival = await prisma.arrivalNotice.create({
                        data: {
                            consol: consol,
                            ataAt: formattedAtaAt,
                            shipment: preAlert.shipment,
                        },
                    });
                }
                const updated = await prisma.preAlert.update({
                    where: { id: preAlert.id },
                    data: {
                        closed: true,
                        arrivalNoticeId: arrival?.id,
                    },
                });

                return updated.id;

            }).filter(Boolean)
        );

        console.log("created_arrival_notice:", createdArrivals);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function SCHEDULE_ARRIVAL_NOTICE() {
    const todayUTC = dayjs().utc();

    const startUTC = todayUTC.startOf("day").toDate();
    const endUTC = todayUTC.endOf("day").toDate();

    try {
        const arrivalsPending = await prisma.arrivalNotice.findMany({
            where: {
                ataAt: {
                    gte: startUTC,
                    lte: endUTC,
                },
                messageKey: null,
                isAnswered: false,
            },
        });

        if (!arrivalsPending || arrivalsPending?.length === 0) return;

        return arrivalsPending?.map(arrival => arrival.id);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function SEND_ARRIVAL_NOTICE({ ids }: { ids: number[] }) {
    try {
        const arrival = await prisma.preAlert.findMany({
            where: {
                id: { in: ids },
                arrivalNotice: {
                    messageKey: null
                }
            },
            select: {
                json: true,
                arrivalNotice: {
                    select: {
                        id: true,
                    }
                }
            }
        });

        if (!arrival || arrival.length === 0) return;

        const updatedArrivals = arrival.map((item) => ({
            ...item,
            json: {
                ...(typeof item.json === "object" && item.json !== null ? item.json : {}),
                type: "ARRIVAL_NOTICE",
            },
        }));

        const sendNotificationArrivals = await Promise.all(
            updatedArrivals.map(async (item) => {
                const notification = await sendNotification(item.json);
                if (
                    !notification ||
                    typeof notification !== "object" ||
                    Object.values(notification).some(v => v == null)
                ) {
                    return;
                }

                const updated = await prisma.arrivalNotice.update({
                    where: { id: item?.arrivalNotice?.id },
                    data: {
                        messageKey: notification.messageId,
                        subject: notification.subject,
                    }
                })

                return updated.messageKey;

            }).filter(Boolean)
        );

        console.log("send_notification_arrival_notice:", sendNotificationArrivals);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function CONFIRM_ARRIVAL_NOTICE(req: Request, res: Response) {
    if (!req.params.id) {
        const error = "No se proporciono un id";
        return res.status(400).json({ error });
    }
    try {
        const decoded = safeDecode(req.params.id);

        const arrival = await prisma.arrivalNotice.update({
            where: { shipment: decoded },
            data: {
                closed: true,
            },
        });

        if (!arrival.id) {
            const error = "Aviso de llegada no encontrado.";
            return res.status(404).json({ error });
        }

        if (arrival?.isAnswered) {
            const message = "El aviso de llegada ya se confirmo. ";
            const date = dateFormater(arrival?.answeredAt as Date);
            return res.status(400).json({ message, date });
        }

        const privateIp = ip.address();
        const { gateway: gw } = await gateway.gateway4async();

        const isBlocked = GATEWAY_NOT_ALLOWED.some(blocked =>
            gw === blocked || gw.startsWith(blocked)
        );

        if (isBlocked) {
            const message = "Lo sentimos, no tienes permiso para confirmar este aviso de llegada.";
            return res.status(403).json({ message });
        }

        const updated = await prisma.arrivalNotice.update({
            where: { id: arrival.id },
            data: {
                isAnswered: true,
                answeredBy: privateIp,
                answeredAt: new Date(),
            },
        });

        if (updated.id) {
            const message = "aviso de llegada confirmado con éxito.";
            return res.status(200).json({
                status: 200,
                message,
            });
        }

        const error = "!Ups!. Error inesperado.";
        return res.status(400).json({ error });

    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function CONFIRM_SCHEDULE_ARRIVAL_NOTICE(req: Request, res: Response) {
    if (!req.params.id) {
        const error = "No se proporciono un id";
        return res.status(400).json({ error });
    }
    try {
        const decoded = safeDecode(req.params.id);

        const arrival = await prisma.arrivalNotice.findFirst({
            where: { shipment: decoded },
            select: {
                arrivalResponse: {
                    select: {
                        send: true,

                    }
                }
            }
        });

        const send = arrival?.arrivalResponse?.send ?? null;
        if (send) {
            const message = "Lo sentimos, ya se solicito la liberación de este embarque.";
            return res.status(400).json({ message });
        }

        return res.status(200).json({ message: "Ok" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error });
    }
};

async function CREATE_SCHEDULE_ARRIVAL_NOTICE(req: Request, res: Response) {
    const body = req.body;

    if (body.date === "" || body.shipment === "") {
        const error = "Todos los campos son obligatorios.";
        return res.status(400).json({ error });
    };

    try {
        const arrivalNotice = await prisma.arrivalNotice.findFirst({
            where: { shipment: body.shipment },
            select: {
                id: true,
                preAlert: {
                    select: {
                        id: true,
                        json: true,
                    }
                },
                arrivalResponse: {
                    select: {
                        key: true,
                    }
                }
            }
        });

        if (!arrivalNotice?.id) {
            const error = "No se encontro el aviso de llegada.";
            return res.status(404).json({ error });
        }

        if (arrivalNotice?.arrivalResponse?.key) {
            const error = "Ya se solicito la liberación de este embarque.";
            return res.status(400).json({ error });
        }

        const shipmentData = {
            json: arrivalNotice?.preAlert?.json,
            release: body.date,
        };

        const responsesRelease = await Promise.all([
            sendNotificationReleaseAccounting(shipmentData),
            sendNotificationReleaseLogistics(shipmentData)
        ]);

        if (responsesRelease.length !== 2) {
            const error = "Error al enviar las notificaciones.";
            return res.status(400).json({ error });
        };

        const addRelease = JSON.stringify({
            release: { date: body.date },
            responsesReleaseAccounting: responsesRelease[0],
            responsesReleaseLogistics: responsesRelease[1]
        });

        const arrivalResponse = await prisma.arrivalResponse.create({
            data: {
                send: true,
                arrivalNoticeId: arrivalNotice?.id,
                json: JSON.parse(addRelease),
            },
        });

        if (!arrivalResponse?.key) {
            const error = "Error al crear la respuesta.";
            return res.status(400).json({ error });
        }

        console.log("add_release:", addRelease);

        return res.status(200).json(arrivalResponse);

    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function UPDATE_ARRIVAL_RESPONSE({
    email,
    status,
    shipment
}: UpdateArrivalNoticeInput) {
    try {
        const arrivalNotice = await prisma.arrivalNotice.findFirst({
            where: {
                shipment: shipment,
            },
            select: {
                id: true,
                subject: true,
                messageKey: true,
                preAlert: true,
                arrivalResponse: {
                    select: {
                        closed: true,
                        json: true
                    }
                }
            }
        });

        if (!arrivalNotice?.id || arrivalNotice?.arrivalResponse?.closed) return null;

        const isAccounting = email === DPTOS_CREDIT[0];
        const isLogistics = email === DPTOS_CREDIT[1];

        const arrivalResponseData: any = {};

        if (isAccounting) {
            arrivalResponseData.responseA = status;
            arrivalResponseData.responseAAt = new Date().toISOString();
        }

        if (isLogistics) {
            arrivalResponseData.responseB = status;
            arrivalResponseData.responseBAt = new Date().toISOString();
        }

        const arrivalResponse = await prisma.arrivalNotice.update({
            where: { id: arrivalNotice?.id },
            data: {
                arrivalResponse: {
                    update: arrivalResponseData
                }
            },
        });

        //send messaje 
        //find arrival response
        const responses = await prisma.arrivalResponse.findFirst({
            where: {
                arrivalNoticeId: arrivalNotice?.id,
            },
            select: {
                id: true,
                responseA: true,
                responseB: true,
                responseAAt: true,
                responseBAt: true,
            }
        });

        if (responses?.responseAAt && responses?.responseBAt) {
            const status = (responses.responseA && responses.responseB) ? "ACEPTADO" : "DENEGADO";

            await prisma.arrivalResponse.update({
                where: { id: responses?.id },
                data: {
                    closed: true,
                },
            });

            const data = {
                subject: arrivalNotice?.subject,
                recipients: arrivalNotice?.preAlert?.recipients,
                messageId: arrivalNotice?.messageKey,
                message: status
            };

            await sendResponseRelease(data);
        }

        return arrivalResponse.messageKey;

    } catch (error) {
        console.error(error);
        throw error;
    }
};

// ENVIAR CORREO
// RECORDATORIO ARRIVAL 
// SHOW DOCUMENT
// ADD TRRIGER

export {
    GET_ATA_ARRIVAL_NOTICE,
    SCHEDULE_ARRIVAL_NOTICE,
    CREATE_ARRIVAL_NOTICE,
    SEND_ARRIVAL_NOTICE,
    CONFIRM_ARRIVAL_NOTICE,
    CONFIRM_SCHEDULE_ARRIVAL_NOTICE,
    CREATE_SCHEDULE_ARRIVAL_NOTICE,
    UPDATE_ARRIVAL_RESPONSE
};

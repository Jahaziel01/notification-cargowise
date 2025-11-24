import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import 'module-alias/register';
import { messageTest, notificationTest, reportTest } from "@/test/index";
import { ANALYZE_TEXT_ROUTE, LAST_MESSAGE_TEXT_ROUTE } from "@/controllers/openIA";
import {
    CONFIRM_PRE_ALERT,
    GET_PENDING_PREALERT_NOTIFICATION_ROUTE
} from "@/controllers/notification/preAlert";
import {
    CREATE_ARRIVAL_NOTICE,
    SEND_ARRIVAL_NOTICE,
    GET_ATA_ARRIVAL_NOTICE,
    CONFIRM_ARRIVAL_NOTICE,
    SCHEDULE_ARRIVAL_NOTICE,
    CONFIRM_SCHEDULE_ARRIVAL_NOTICE,
    CREATE_SCHEDULE_ARRIVAL_NOTICE
} from "@/controllers/notification/arrivalNotice";
import xmlParser from "@/data/parse";
import { getAttachmentsBySubject } from "@/imap/ghost";
import { uploadPdfFromBuffer } from "@/controllers/supebase";
import { GET_PDF } from "@/controllers/supebase";

import "@/imap/ghost";
import "@/imap/reminder";

/** 
CREATE_ARRIVAL_NOTICE({
    consol: "C18596",
    ataAt: new Date(),
});
SEND_ARRIVAL_NOTICE({ ids: [5] });
GET_ATA_ARRIVAL_NOTICE({ shipment: "SIS250913663" });
SCHEDULE_ARRIVAL_NOTICE(); //to reminder
*/

async function testPdfUpload() {
    try {
        // 1. Obtener los PDFs del correo
        const attachments = await getAttachmentsBySubject("DOCUMENTS PRE_ALERT SIS250913663");

        console.log("Raw attachments:", attachments);

        if (!attachments || attachments.length === 0) {
            console.log("No PDF attachments found");
            return;
        }

        // 2. Tomar el primer PDF
        const firstPdf = attachments[0];
        console.log("Uploading:", firstPdf.filename);

        // 3. Subirlo a Supabase
        const uploaded = await uploadPdfFromBuffer(firstPdf.filename, firstPdf.content);

        console.log("Uploaded:", uploaded);

    } catch (err) {
        console.error("Error testing upload:", err);
    }
}

// Ejecutarlo
//testPdfUpload();

dotenv.config();
const app = express();

const corsOptions = {
    origin: "*",
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(express.json());
app.use(cors(corsOptions));

app.use("/images", express.static(path.join(__dirname, "./public")));

app.get('/api/pre-alert/pending', GET_PENDING_PREALERT_NOTIFICATION_ROUTE);

app.get('/api/arrival/confirm/:id', CONFIRM_ARRIVAL_NOTICE);
app.get('/api/pre-alert/confirm/:id', CONFIRM_PRE_ALERT);

app.get('/api/arrival/schedule/:id', CONFIRM_SCHEDULE_ARRIVAL_NOTICE);
app.post('/api/arrival/schedule/create', CREATE_SCHEDULE_ARRIVAL_NOTICE);

app.post('/api/openia/text/analyze', ANALYZE_TEXT_ROUTE);
app.post('/api/openia/text/last-message', LAST_MESSAGE_TEXT_ROUTE);

app.get('/api/supabase/pdf/:filename', GET_PDF);
app.post('/api/supabase/pdf', (req, res) => { });

app.get('/api/report', (req, res) => { });

app.get('/api/test/report', reportTest);
app.post('/api/test/message', messageTest);
app.post('/api/test/notification', notificationTest);

///xmlParser("", "PRE_ALERT").then(() => { console.log("Parser completed"); });


app.listen(3000, () => { });
import express from "express";
import cors from "cors";
import { connectMail } from "./imap/ghost";
import { messageTest } from "./test/index";

const app = express();

const corsOptions = {
    origin: "*",
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(express.json());
app.use(cors(corsOptions));

app.post('/api/test/message', messageTest);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

connectMail().catch(console.error);
//xmlParser('');

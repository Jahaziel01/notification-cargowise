import OpenAI from "openai";
import { Request, Response } from "express";
import { prompt_analize_text, last_message_text } from "@/constants/prompt";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const ANALYZE_TEXT = async (text: string): Promise<string | any> => {
    try {
        if (!text) return { error: "Field is required." };

        const prompt = prompt_analize_text(text);

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Responde SOLO con JSON válido." },
                { role: "user", content: prompt }
            ],
            max_tokens: 150
        });

        const raw =
            completion?.choices?.[0]?.message?.content?.trim() || "";

        let result;
        try {
            result = JSON.parse(raw);
        } catch {
            result = { estado: "RECHAZADO", motivo: "El modelo no pudo interpretar el texto." };
        }

        return result;

    } catch (error) {
        console.error(error);
        return { error: "" };
    }
};

export const LAST_MESSAGE_TEXT = async (text: string): Promise<string | any> => {
    try {
        if (!text) return { error: "Field is required." };

        const prompt = last_message_text(text);

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Responde SOLO con JSON válido." },
                { role: "user", content: prompt }
            ],
            max_tokens: 150
        });

        const raw =
            completion?.choices?.[0]?.message?.content?.trim() || "";

        let result;
        try {
            result = JSON.parse(raw);
        } catch {
            result = { estado: "RECHAZADO", motivo: "El modelo no pudo interpretar el texto." };
        }

        return result;

    } catch (error) {
        console.error(error);
        return { error: "" };
    }
};

export const ANALYZE_TEXT_ROUTE = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const result = await ANALYZE_TEXT(body?.text as string);

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "" });
    }
};

export const LAST_MESSAGE_TEXT_ROUTE = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const result = await LAST_MESSAGE_TEXT(body?.text as string);

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "" });
    }
};
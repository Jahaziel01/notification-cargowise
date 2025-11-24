import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function uploadPdfFromBuffer(filename: string, buffer: Buffer) {
    const path = `pdf/${filename}`;

    const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET!)
        .upload(path, buffer, {
            contentType: "application/pdf",
            upsert: false
        });

    if (error) {
        throw new Error("Error uploading PDF: " + error.message);
    }

    const { data: publicData } = supabase.storage
        .from(process.env.SUPABASE_BUCKET!)
        .getPublicUrl(path);

    return {
        fileName: filename,
        url: publicData.publicUrl
    };
};

export async function GET_PDF(req: Request, res: Response) {
    try {
        const filename = req.params.filename;

        if (!filename) {
            return res.status(400).json({ error: "Nombre del archivo no proporcionado" });
        }

        const { data: files, error: listError } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET!)
            .list("pdf", {
                search: filename
            });

        if (listError) {
            return res.status(500).json({ error: listError.message });
        }

        if (!files || files.length === 0) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        const foundFile = files[0].name;
        const filePath = `pdf/${foundFile}`;

        const { data, error: downloadError } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET!)
            .download(filePath);

        if (downloadError) {
            return res.status(500).json({ error: downloadError.message });
        }

        const buffer = Buffer.from(await data.arrayBuffer());

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${foundFile}"`);

        return res.send(buffer);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Error al obtener el archivo" });
    }
}

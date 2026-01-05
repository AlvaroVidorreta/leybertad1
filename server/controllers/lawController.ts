import { Request, Response } from "express";
import { LawService } from "../services/lawService";
import { getVisitorKey } from "../utils/visitor";

export class LawController {
    static async getRecientes(req: Request, res: Response) {
        try {
            const laws = await LawService.getRecent();
            res.json(laws);
        } catch (err) {
            console.error("Error getting laws:", err);
            res.status(500).json({ error: "Error interno" });
        }
    }

    static async create(req: Request, res: Response) {
        const visitor = getVisitorKey(req);
        try {
            const law = await LawService.create(visitor, req.body);
            res.json(law);
        } catch (err: any) {
            if (err.name === "ZodError") {
                return res.status(400).json({ error: "Datos inválidos" });
            }
            console.error("Error creating law:", err);
            res.status(500).json({ error: "Error al crear ley" });
        }
    }

    static async vote(req: Request, res: Response) {
        const visitor = getVisitorKey(req);
        try {
            const updated = await LawService.vote(visitor, req.params.id, 1);
            if (!updated) return res.status(404).json({ error: "Ley no encontrada" });
            res.json(updated);
        } catch (err) {
            console.error("Rating error:", err);
            res.status(500).json({ error: "Error al votar" });
        }
    }

    static async save(req: Request, res: Response) {
        const visitor = getVisitorKey(req);
        try {
            const saved = await LawService.save(visitor, req.params.id);
            if (!saved) return res.status(404).json({ error: "Ley no encontrada" });
            res.json(saved);
        } catch (err) {
            console.error("Save error:", err);
            res.status(500).json({ error: "Error al guardar" });
        }
    }

    static async comment(req: Request, res: Response) {
        const visitor = getVisitorKey(req);
        try {
            const updated = await LawService.comment(visitor, req.params.id, req.body);
            if (!updated) return res.status(404).json({ error: "Ley no encontrada" });
            res.json(updated);
        } catch (err: any) {
            if (err.name === "ZodError") {
                return res.status(400).json({ error: "Comentario inválido" });
            }
            console.error("Comment error:", err);
            res.status(500).json({ error: "Error al comentar" });
        }
    }

    static async getRanking(req: Request, res: Response) {
        try {
            const range = (req.query.range as string) || "month";
            const ranking = await LawService.getRanking(range);
            res.json(ranking);
        } catch (err) {
            console.error("Ranking error:", err);
            res.status(500).json({ error: "Error ranking" });
        }
    }
}

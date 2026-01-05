import { db } from "../db";
import { CreateLawSchema, CommentSchema } from "../../shared/schemas";
import { z } from "zod";
import { Law } from "../../shared/api";

type CreateLawInput = z.infer<typeof CreateLawSchema>;
type CommentInput = z.infer<typeof CommentSchema>;

export class LawService {
    static async getRecent() {
        return await db.listRecent();
    }

    static async create(visitorId: string, input: CreateLawInput) {
        const validated = CreateLawSchema.parse(input);
        return await db.createLaw(validated, visitorId);
    }

    static async vote(visitorId: string, lawId: string, value: number) {
        return await db.upvoteLaw(lawId, visitorId);
    }

    static async save(visitorId: string, lawId: string) {
        return await db.saveLaw(lawId, visitorId);
    }

    static async comment(visitorId: string, lawId: string, input: CommentInput) {
        const validated = CommentSchema.parse(input);
        return await db.commentLaw(lawId, visitorId, validated.texto);
    }

    static async getRanking(range: string) {
        return await db.ranking(range as any);
    }
}

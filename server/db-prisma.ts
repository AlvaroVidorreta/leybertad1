// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import type { Law, LawInput, TimeRange } from "../shared/api";
import { randomUUID } from "crypto";
import { mapToLawResponse } from "./utils/mappers"; // We will create this mapper file

const prisma = new PrismaClient();

// Helper to ensure User exists before creating related records
async function ensureUser(userId: string) {
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `temp_${userId}@placeholder.com`,
      },
    });
  } catch (e) {
    // ignore constraint errors for now
  }
}

export const db = {
  async createLaw(input: LawInput, visitorKey: string) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await ensureUser(visitorKey);

    const count = await prisma.law.count({
      where: {
        authorId: visitorKey,
        createdAt: { gt: dayAgo },
      },
    });

    if (count >= 5) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    const law = await prisma.law.create({
      data: {
        title: input.titulo,
        objective: input.objetivo,
        details: input.detalles,
        nickname: input.apodo,
        authorId: visitorKey,
      },
    });

    return mapToLawResponse(law, [], 0, 0);
  },

  async listRecent() {
    const laws = await prisma.law.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        comments: true,
      },
    });
    return laws.map((l) =>
      mapToLawResponse(l, l.comments, l.upvotesCount, l.savesCount),
    );
  },

  async upvoteLaw(id: string, visitorKey: string) {
    await ensureUser(visitorKey);

    const existing = await prisma.vote.findUnique({
      where: {
        lawId_userId: {
          lawId: id,
          userId: visitorKey,
        },
      },
    });

    if (existing) throw new Error("ALREADY_VOTED");

    const updatedLaw = await prisma.$transaction(async (tx) => {
      await tx.vote.create({
        data: {
          lawId: id,
          userId: visitorKey,
          type: "UPVOTE",
        },
      });

      const l = await tx.law.update({
        where: { id },
        data: {
          upvotesCount: { increment: 1 },
        },
        include: { comments: true },
      });

      return l;
    });

    return mapToLawResponse(
      updatedLaw,
      updatedLaw.comments,
      updatedLaw.upvotesCount,
      updatedLaw.savesCount,
    );
  },

  async saveLaw(id: string, userId?: string) {
    if (!userId) {
      const l = await prisma.law.update({
        where: { id },
        data: { savesCount: { increment: 1 } },
        include: { comments: true },
      });
      return mapToLawResponse(l, l.comments, l.upvotesCount, l.savesCount);
    }

    await ensureUser(userId);

    const updatedLaw = await prisma.$transaction(async (tx) => {
      const existing = await tx.savedLaw.findUnique({
        where: { lawId_userId: { lawId: id, userId } },
      });

      if (!existing) {
        await tx.savedLaw.create({
          data: { lawId: id, userId },
        });

        return await tx.law.update({
          where: { id },
          data: { savesCount: { increment: 1 } },
          include: { comments: true },
        });
      } else {
        return await tx.law.findUniqueOrThrow({
          where: { id },
          include: { comments: true },
        });
      }
    });

    return mapToLawResponse(
      updatedLaw,
      updatedLaw.comments,
      updatedLaw.upvotesCount,
      updatedLaw.savesCount,
    );
  },

  async commentLaw(id: string, texto: string, author?: string) {
    if (!author) throw new Error("Autenticación requerida para comentar");

    await ensureUser(author);

    const comment = await prisma.comment.create({
      data: {
        content: texto,
        lawId: id,
        userId: author,
      },
    });

    const law = await prisma.law.findUnique({
      where: { id },
      include: { comments: true },
    });

    if (!law) throw new Error("NOT_FOUND");

    return mapToLawResponse(
      law,
      law.comments,
      law.upvotesCount,
      law.savesCount,
    );
  },

  async ranking(range: TimeRange) {
    const whereClause: any = {};
    if (range !== "all") {
      const now = new Date();
      const past = new Date();
      if (range === "day") past.setDate(now.getDate() - 1);
      if (range === "week") past.setDate(now.getDate() - 7);
      if (range === "month") past.setMonth(now.getMonth() - 1);
      if (range === "semester") past.setMonth(now.getMonth() - 6);

      whereClause.createdAt = { gte: past };
    }

    const laws = await prisma.law.findMany({
      where: whereClause,
      orderBy: [{ upvotesCount: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { comments: true },
    });

    return laws.map((l) =>
      mapToLawResponse(l, l.comments, l.upvotesCount, l.savesCount),
    );
  },

  async getProfile(visitorKey: string) {
    const user = await prisma.user.findUnique({
      where: { id: visitorKey },
    });
    if (!user) return null;
    return {
      displayName: user.username || undefined,
      username: user.username || undefined,
      id: user.id,
    };
  },

  async setProfile(
    visitorKey: string,
    payload: { displayName?: string; username?: string },
  ) {
    const user = await prisma.user.upsert({
      where: { id: visitorKey },
      create: {
        id: visitorKey,
        username: payload.username || payload.displayName,
        email: `temp_${visitorKey}@placeholder.com`,
      },
      update: {
        username: payload.username || payload.displayName,
      },
    });
    return {
      displayName: user.username || undefined,
      username: user.username || undefined,
      id: user.id,
    };
  },
};

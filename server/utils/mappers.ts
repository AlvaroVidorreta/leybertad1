import type { Law } from "../../shared/api";

export function mapToLawResponse(
  law: any,
  comments: any[],
  upvotes: number,
  saves: number,
): Law {
  return {
    id: law.id,
    titulo: law.title,
    objetivo: law.objective,
    detalles: law.details || undefined,
    apodo: law.nickname || undefined,
    createdAt: law.createdAt.toISOString(),
    upvotes: upvotes,
    saves: saves,
    comentarios: comments.map((c) => ({
      id: c.id,
      texto: c.content,
      createdAt: c.createdAt.toISOString(),
      author: c.userId,
    })),
  };
}

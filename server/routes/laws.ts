import { Router } from "express";
import { LawController } from "../controllers/lawController";
import { rateLimitCreateLaw } from "../middleware/rateLimit";

const router = Router();

// GET /api/laws (formerly /recent)
router.get("/", LawController.getRecientes);

// POST /api/laws (formerly /create)
router.post("/", rateLimitCreateLaw, LawController.create);

// POST /api/laws/:id/vote
router.post("/:id/vote", LawController.vote);

// POST /api/laws/:id/save
router.post("/:id/save", LawController.save);

// POST /api/laws/:id/comment
router.post("/:id/comment", LawController.comment);

// GET /api/laws/ranking
// Note: Frontend calls /api/ranking, not /api/laws/ranking.
// We should check index.ts mount point.
// If index.ts mounts this router at /api/laws, then this becomes /api/laws/ranking.
// If frontend calls /api/ranking, we might need a separate router or mount specific path in index.ts.
router.get("/ranking", LawController.getRanking);

export { router as lawsRouter };

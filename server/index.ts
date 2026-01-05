import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  commentLaw,
  createLaw,
  listRecent,
  ranking,
  saveLaw,
  upvoteLaw,
} from "./routes/laws";
import { profileHandler, profileUpdateHandler } from "./routes/profile";
import { boeHandler } from "./routes/boe";
import { rateLimitCreateLaw } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Leybertad API
  app.post("/api/laws", rateLimitCreateLaw, createLaw); // crear propuesta con rate limiting
  app.get("/api/laws", listRecent); // más recientes
  app.post("/api/laws/:id/upvote", upvoteLaw);
  app.post("/api/laws/:id/save", saveLaw);
  app.post("/api/laws/:id/comment", commentLaw);
  app.get("/api/ranking", ranking);

  // BOE search endpoint
  app.get("/api/boe/search", boeHandler);

  // Profile endpoint for current visitor
  app.get("/api/profile", profileHandler);
  app.post("/api/profile", profileUpdateHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

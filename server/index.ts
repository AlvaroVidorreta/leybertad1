import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { handleDemo } from "./routes/demo";
import { lawsRouter } from "./routes/laws";
import { LawController } from "./controllers/lawController";
import { profileHandler, profileUpdateHandler } from "./routes/profile";
import boeRouter from "./routes/boe";
import { errorHandler } from "./middleware/errorHandler";
import {
  sessionMiddleware,
  initializeSessionMiddleware,
} from "./middleware/session";

// Initialize session cleanup on module load
initializeSessionMiddleware();

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(sessionMiddleware); // Session must be before routes

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Leybertad API
  app.use("/api/laws", lawsRouter);

  // Ranking endpoint at root for frontend compatibility
  app.get("/api/ranking", LawController.getRanking);

  // BOE endpoints
  app.use("/api/boe", boeRouter);

  // Profile endpoint for current visitor
  app.get("/api/profile", profileHandler);
  app.post("/api/profile", profileUpdateHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

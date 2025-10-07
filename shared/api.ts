/**
 * Shared code between client and server for Leybertad
 */

export interface DemoResponse {
  message: string;
}

export type TimeRange = "day" | "week" | "month" | "semester" | "all";

export interface LawInput {
  titulo: string; // Texto principal de la propuesta
  objetivo: string; // Objetivo breve (requerido)
  detalles?: string; // Perspectiva personal (opcional)
  apodo?: string; // Nick opcional
  // Optional classification fields to help categorize the submitted law
  category?: string;
  subcategory?: string;
}

export interface CommentInput {
  texto: string; // max 200 chars
}

export interface Comment {
  id: string;
  texto: string;
  createdAt: string; // ISO date
}

export interface Law extends LawInput {
  id: string;
  createdAt: string; // ISO date
  upvotes: number;
  saves: number;
  comentarios: Comment[];
}

export interface CreateLawResponse {
  law: Law;
}

export interface LawsResponse {
  items: Law[];
}

export interface LawUpdatedResponse {
  law: Law;
}

export interface RankingResponse {
  items: Law[]; // ordered by upvotes desc
}

export interface ProfileResponse {
  displayName: string;
  username: string;
  created: Law[];
  voted: Law[];
}

import { z } from "zod";

/**
 * Validation schemas for Leybertad API inputs
 * These schemas ensure data integrity and prevent malformed requests
 */

// Law creation validation
export const CreateLawSchema = z.object({
  titulo: z
    .string()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(500, "El título no puede exceder 500 caracteres")
    .trim(),
  objetivo: z
    .string()
    .min(10, "El objetivo debe tener al menos 10 caracteres")
    .max(200, "El objetivo no puede exceder 200 caracteres")
    .trim(),
  detalles: z
    .string()
    .max(2000, "Los detalles no pueden exceder 2000 caracteres")
    .trim()
    .optional(),
  apodo: z
    .string()
    .max(60, "El apodo no puede exceder 60 caracteres")
    .trim()
    .optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
});

export type CreateLawInput = z.infer<typeof CreateLawSchema>;

// Comment validation
export const CommentSchema = z.object({
  texto: z
    .string()
    .min(1, "El comentario no puede estar vacío")
    .max(200, "El comentario no puede exceder 200 caracteres")
    .trim(),
});

export type ValidatedComment = z.infer<typeof CommentSchema>;

// Profile validation
export const ProfileSchema = z.object({
  displayName: z
    .string()
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim()
    .optional(),
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario no puede exceder 30 caracteres")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "El usuario solo puede contener letras, números, guiones y guiones bajos",
    )
    .trim()
    .optional(),
});

export type ValidatedProfile = z.infer<typeof ProfileSchema>;

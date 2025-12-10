# Leybertad: Guía Práctica de Implementación

Esta guía proporciona pasos concretos, código listo para usar, y decisiones para implementar las mejoras arquitectónicas.

## Tabla de Contenidos

1. [Decisión de Tecnología](#decisión-de-tecnología)
2. [Fase 1: Setup Supabase](#fase-1-setup-supabase)
3. [Fase 2: Prisma ORM](#fase-2-prisma-orm)
4. [Fase 3: Autenticación Segura](#fase-3-autenticación-segura)
5. [Fase 4: Migración de Datos](#fase-4-migración-de-datos)
6. [Fase 5: Nuevas Rutas](#fase-5-nuevas-rutas)
7. [Fase 6: Testing](#fase-6-testing)
8. [Troubleshooting](#troubleshooting)

---

## Decisión de Tecnología

### Por qué Supabase sobre otros

**Opción 1: Mantener Firebase Firestore + mejorar**
- ✅ Ya está en el proyecto
- ❌ Firestore es NoSQL, difícil de modelar relaciones complejas
- ❌ Caro a escala (lectura/escritura por documento)
- ❌ Difícil de hacer queries complejas (ranking, búsqueda)

**Opción 2: Migrar a Supabase (PostgreSQL)**
- ✅ SQL estándar, relaciones claras
- ✅ Económico (pago por instancia, no por query)
- ✅ Full-text search nativo
- ✅ Mejor para redes sociales
- ✅ Prisma tiene soporte excelente
- ❌ Requiere migración de datos

**Opción 3: Usar MongoDB (Atlas)**
- ✅ Flexible, sin schema
- ❌ Transacciones débiles
- ❌ Más caro que PostgreSQL
- ❌ Peor para queries relacionales

**Opción 4: Mantener JSON local**
- ✅ Simple, sin dependencias externas
- ❌ No escalable
- ❌ No seguro (acceso directo a archivo)
- ❌ Sin concurrencia

### ✅ Recomendación Final: Supabase + Prisma

**Costo estimado**: $25-50/mes en producción (muy asequible)
**Tiempo de migración**: 3-4 horas
**Beneficio**: 10x mejor escalabilidad

---

## Fase 1: Setup Supabase

### Paso 1.1: Crear Proyecto Supabase

1. Ir a https://supabase.com/dashboard
2. Click en "New Project"
3. Llenar datos:
   - **Nombre**: leybertad
   - **Password**: Generar uno fuerte
   - **Region**: Más cercano a tus usuarios (ej: eu-west-1 para Europa)
4. Esperar creación (~2 min)
5. Ir a Settings → Database → Connection Pooling
   - Cambiar a "Supabase Session" o "Transaction"

### Paso 1.2: Obtener Credenciales

**En Supabase Dashboard:**
1. Settings → Database
2. Copiar:
   - **Direct URL** (para desarrollo)
   - **Pooling URL** (para producción con many connections)

**Resultado**:
```
postgresql://postgres:PASSWORD@host:5432/postgres
```

### Paso 1.3: Actualizar Variables de Entorno

```env
# .env.local (desarrollo)
DATABASE_URL="postgresql://user:password@host.supabase.co:5432/postgres?schema=public"

# .env.production (producción)
DATABASE_URL="postgresql://user:password@host.supabase.co:6543/postgres?schema=public&sslmode=require"
```

### Paso 1.4: Instalar Dependencias

```bash
pnpm add @supabase/supabase-js @prisma/client
pnpm add -D prisma
```

---

## Fase 2: Prisma ORM

### Paso 2.1: Inicializar Prisma

```bash
npx prisma init --datasource-provider postgresql
```

Esto crea:
- `prisma/schema.prisma` - Tu schema
- `.env` - Variables de entorno

### Paso 2.2: Definir Schema

**Crear `prisma/schema.prisma`**:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Usuarios vinculados a Firebase
model User {
  id            String    @id @default(cuid())
  firebaseUid   String    @unique
  email         String    @unique
  displayName   String?
  username      String?   @unique
  avatarUrl     String?
  bio           String?
  role          String    @default("user") // user, moderator, admin
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relaciones
  laws          Law[]
  votes         Vote[]
  saves         Save[]
  comments      Comment[]
  followers     User[]    @relation("UserFollowers")
  followedBy    User[]    @relation("UserFollowers")

  @@index([firebaseUid])
  @@index([username])
}

// Leyes/Propuestas
model Law {
  id            String    @id @default(cuid())
  titulo        String    @db.VarChar(500)
  objetivo      String    @db.VarChar(200)
  detalles      String?   @db.Text
  apodo         String?   @db.VarChar(60)
  category      String?   // economic, social, political, etc
  status        String    @default("active") // active, archived, deleted
  
  author        User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId      String
  
  comments      Comment[]
  votes         Vote[]
  saves         Save[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // soft delete

  @@index([authorId])
  @@index([createdAt])
  @@index([status])
  @@fulltext([titulo, objetivo]) // Para búsqueda en PostgreSQL
}

// Comentarios
model Comment {
  id            String    @id @default(cuid())
  texto         String    @db.VarChar(200)
  
  law           Law       @relation(fields: [lawId], references: [id], onDelete: Cascade)
  lawId         String
  
  author        User?     @relation(fields: [authorId], references: [id], onDelete: SetNull)
  authorId      String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([lawId])
  @@index([authorId])
}

// Votos de usuario (1 user can't vote twice on same law)
model Vote {
  id            String    @id @default(cuid())
  
  law           Law       @relation(fields: [lawId], references: [id], onDelete: Cascade)
  lawId         String
  
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String
  
  createdAt     DateTime  @default(now())

  @@unique([lawId, userId])
  @@index([userId])
}

// Guardados
model Save {
  id            String    @id @default(cuid())
  
  law           Law       @relation(fields: [lawId], references: [id], onDelete: Cascade)
  lawId         String
  
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId        String
  
  createdAt     DateTime  @default(now())

  @@unique([lawId, userId])
  @@index([userId])
}
```

### Paso 2.3: Crear Migraciones

```bash
# Crear la migración inicial
npx prisma migrate dev --name init

# Si quieres solo validar sin aplicar aún
npx prisma migrate diff --from-empty --to-schema-datasource prisma/schema.prisma --script
```

### Paso 2.4: Generar Cliente Prisma

```bash
npx prisma generate
```

Esto genera el cliente en `node_modules/.prisma/client/` (auto-manejado).

### Paso 2.5: Verificar Conexión

```bash
npx prisma db push
# O si tienes migraciones pendientes
npx prisma migrate deploy
```

**Abrir Prisma Studio** (UI visual):
```bash
npx prisma studio
# Abre en http://localhost:5555
```

---

## Fase 3: Autenticación Segura

### Paso 3.1: Crear Middleware de Auth

**Crear `server/middleware/auth.ts`**:

```typescript
import { RequestHandler } from "express";
import * as admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware que valida JWT de Firebase y carga usuario
 * Attach: req.uid, req.user
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    // Verificar token con Firebase Admin SDK
    const decoded = await admin.auth().verifyIdToken(token);

    // Sincronizar usuario con DB
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      // Crear usuario automáticamente en primera login
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email || "",
          displayName: decoded.name,
        },
      });
    }

    // Attach a request para usar en rutas
    req.uid = decoded.uid;
    req.user = user;

    next();
  } catch (err: any) {
    const msg = err?.message || String(err);

    if (msg.includes("Decoding failed")) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    if (msg.includes("Token expired")) {
      return res.status(401).json({ error: "Token expired, please re-login" });
    }

    res.status(401).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware que verifica si usuario es admin
 * Debe usarse DESPUÉS de requireAuth
 */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * Middleware que verifica si es el dueño del recurso
 * Uso: requireOwner("authorId")
 */
export const requireOwner =
  (fieldName: string): RequestHandler =>
  async (req, res, next) => {
    const resourceOwnerId = req.body[fieldName] || req.params[fieldName];

    if (resourceOwnerId !== req.uid) {
      return res
        .status(403)
        .json({ error: "You don't have permission to do this" });
    }

    next();
  };

// TypeScript: extender Express.Request
declare global {
  namespace Express {
    interface Request {
      uid?: string;
      user?: any; // Reemplazar con User type de Prisma
    }
  }
}
```

### Paso 3.2: Aplicar Middleware en Rutas

**Actualizar `server/index.ts`**:

```typescript
import { requireAuth, requireAdmin } from "./middleware/auth";

export function createServer() {
  const app = express();

  // ... middlewares anteriores ...

  // Rutas protegidas
  app.post("/api/laws", requireAuth, createLaw);
  app.post("/api/laws/:id/upvote", requireAuth, upvoteLaw);
  app.post("/api/laws/:id/comment", requireAuth, commentLaw);
  app.post("/api/profile", requireAuth, profileUpdateHandler);

  // Rutas públicas
  app.get("/api/laws", listRecent);
  app.get("/api/ranking", ranking);
  app.get("/api/profile/:username", getPublicProfile);

  // Rutas admin
  app.delete("/api/laws/:id", requireAuth, requireAdmin, deleteLaw);

  return app;
}
```

### Paso 3.3: Enviar Token desde Cliente

**Actualizar `client/lib/api.ts`**:

```typescript
import { auth } from "@/lib/firebase";

/**
 * Wrapper para fetch que automáticamente añade token de Firebase
 */
async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

// Uso en componentes
export async function createLaw(data: CreateLawInput) {
  return apiFetch("/api/laws", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function upvoteLaw(lawId: string) {
  return apiFetch(`/api/laws/${lawId}/upvote`, {
    method: "POST",
  });
}
```

---

## Fase 4: Migración de Datos

### Paso 4.1: Script de Migración

**Crear `server/scripts/migrate-firestore-to-supabase.ts`**:

```typescript
import * as admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migrar datos desde Firestore/JSON a Supabase PostgreSQL
 * Ejecutar con: npx tsx server/scripts/migrate-firestore-to-supabase.ts
 */
async function migrate() {
  console.log("🚀 Iniciando migración...");

  try {
    // 1. Obtener todos los usuarios de Firestore
    console.log("1️⃣ Migrando usuarios...");
    const profilesSnap = await admin
      .firestore()
      .collection("profiles")
      .get();

    for (const doc of profilesSnap.docs) {
      const data = doc.data();
      await prisma.user.upsert({
        where: { firebaseUid: doc.id },
        create: {
          firebaseUid: doc.id,
          email: data.email || "unknown@leybertad.local",
          displayName: data.displayName,
          username: data.username,
        },
        update: {
          displayName: data.displayName,
          username: data.username,
        },
      });
    }

    console.log(`✅ ${profilesSnap.size} usuarios migrados`);

    // 2. Obtener todas las leyes
    console.log("2️⃣ Migrando leyes...");
    const lawsSnap = await admin.firestore().collection("laws").get();

    const lawMap: Record<string, string> = {}; // Firestore ID -> Postgres ID

    for (const doc of lawsSnap.docs) {
      const data = doc.data();

      // Obtener usuario autor
      const author = await prisma.user.findFirst({
        where: { firebaseUid: data.authorVisitor },
      });

      if (!author) {
        console.warn(`⚠️ Autor no encontrado: ${data.authorVisitor}`);
        continue;
      }

      const law = await prisma.law.create({
        data: {
          titulo: data.titulo,
          objetivo: data.objetivo,
          detalles: data.detalles,
          apodo: data.apodo,
          authorId: author.id,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        },
      });

      lawMap[doc.id] = law.id;
    }

    console.log(`✅ ${lawsSnap.size} leyes migradas`);

    // 3. Obtener comentarios
    console.log("3️⃣ Migrando comentarios...");
    let commentCount = 0;

    for (const doc of lawsSnap.docs) {
      const data = doc.data();
      const newLawId = lawMap[doc.id];

      if (!newLawId || !Array.isArray(data.comentarios)) continue;

      for (const comment of data.comentarios) {
        const author = comment.author
          ? await prisma.user.findFirst({
              where: { displayName: comment.author },
            })
          : null;

        await prisma.comment.create({
          data: {
            texto: comment.texto,
            lawId: newLawId,
            authorId: author?.id,
            createdAt: comment.createdAt
              ? new Date(comment.createdAt)
              : new Date(),
          },
        });

        commentCount++;
      }
    }

    console.log(`✅ ${commentCount} comentarios migrados`);

    // 4. Obtener votos
    console.log("4️⃣ Migrando votos...");
    let voteCount = 0;

    for (const lawDoc of lawsSnap.docs) {
      const votesSnap = await admin
        .firestore()
        .collection("laws")
        .doc(lawDoc.id)
        .collection("votes")
        .get();

      const newLawId = lawMap[lawDoc.id];
      if (!newLawId) continue;

      for (const voteDoc of votesSnap.docs) {
        const voter = await prisma.user.findFirst({
          where: { firebaseUid: voteDoc.id },
        });

        if (!voter) continue;

        await prisma.vote.upsert({
          where: { lawId_userId: { lawId: newLawId, userId: voter.id } },
          create: { lawId: newLawId, userId: voter.id },
          update: {},
        });

        voteCount++;
      }
    }

    console.log(`✅ ${voteCount} votos migrados`);

    console.log("✨ Migración completada exitosamente");
  } catch (error) {
    console.error("❌ Error durante migración:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
```

### Paso 4.2: Ejecutar Migración

```bash
# En desarrollo
npx tsx server/scripts/migrate-firestore-to-supabase.ts

# En producción (con backup primero)
# 1. Backup: Supabase Dashboard → Database → Backups
# 2. Ejecutar: NODE_ENV=production npx tsx server/scripts/migrate-firestore-to-supabase.ts
```

### Paso 4.3: Validar Datos

```bash
# Abrir Prisma Studio
npx prisma studio

# Verificar:
# - User count
# - Law count
# - Comments count
# - Votes count
```

---

## Fase 5: Nuevas Rutas

### Paso 5.1: Crear Rutas con Prisma

**Reemplazar `server/routes/laws.ts`**:

```typescript
import { RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";
import { CreateLawSchema } from "@shared/schemas";
import type { Law } from "@shared/api";

const prisma = new PrismaClient();

export const createLaw: RequestHandler = async (req, res) => {
  try {
    // Validar datos de entrada
    const validated = CreateLawSchema.parse(req.body);

    // Crear ley
    const law = await prisma.law.create({
      data: {
        ...validated,
        authorId: req.user.id,
      },
      include: {
        author: true,
        _count: { select: { votes: true, saves: true, comments: true } },
      },
    });

    res.status(201).json({
      law: {
        ...law,
        upvotes: law._count.votes,
        saves: law._count.saves,
        comentarios: [],
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Unique constraint violation
      return res.status(400).json({ error: "Duplicate username or email" });
    }
    res.status(400).json({ error: error.message });
  }
};

export const listRecent: RequestHandler = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [laws, total] = await Promise.all([
      prisma.law.findMany({
        where: { status: "active" },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, displayName: true, username: true } },
          _count: {
            select: { votes: true, saves: true, comments: true },
          },
        },
      }),
      prisma.law.count({ where: { status: "active" } }),
    ]);

    res.json({
      items: laws.map((law) => ({
        ...law,
        upvotes: law._count.votes,
        saves: law._count.saves,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const ranking: RequestHandler = async (req, res) => {
  try {
    const range = (req.query.range as string) || "week";
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    // Calcular fecha
    const now = new Date();
    let since = new Date();

    switch (range) {
      case "day":
        since.setDate(since.getDate() - 1);
        break;
      case "week":
        since.setDate(since.getDate() - 7);
        break;
      case "month":
        since.setMonth(since.getMonth() - 1);
        break;
      case "semester":
        since.setMonth(since.getMonth() - 6);
        break;
      default:
        since = new Date("1970-01-01");
    }

    const laws = await prisma.law.findMany({
      where: {
        status: "active",
        createdAt: { gte: since },
      },
      take: limit,
      orderBy: {
        votes: { _count: "desc" },
      },
      include: {
        author: { select: { id: true, displayName: true } },
        _count: {
          select: { votes: true, saves: true, comments: true },
        },
      },
    });

    res.json({
      items: laws.map((law) => ({
        ...law,
        upvotes: law._count.votes,
        saves: law._count.saves,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const upvoteLaw: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Crear voto (unique constraint previene duplicados)
    const vote = await prisma.vote.create({
      data: { lawId: id, userId },
    });

    // Obtener ley actualizada
    const law = await prisma.law.findUnique({
      where: { id },
      include: {
        author: true,
        _count: { select: { votes: true, saves: true, comments: true } },
      },
    });

    res.json({
      law: {
        ...law,
        upvotes: law?._count.votes || 0,
        saves: law?._count.saves || 0,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Already voted" });
    }
    res.status(500).json({ error: error.message });
  }
};

export const saveLaw: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.save.upsert({
      where: { lawId_userId: { lawId: id, userId } },
      create: { lawId: id, userId },
      update: {},
    });

    const law = await prisma.law.findUnique({
      where: { id },
      include: {
        _count: { select: { votes: true, saves: true, comments: true } },
      },
    });

    res.json({
      law: {
        ...law,
        upvotes: law?._count.votes || 0,
        saves: law?._count.saves || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const commentLaw: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { texto } = req.body;

    const comment = await prisma.comment.create({
      data: {
        texto,
        lawId: id,
        authorId: req.user.id,
      },
    });

    res.json({ comment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
```

### Paso 5.2: Actualizar shared/schemas.ts

```typescript
import { z } from "zod";

export const CreateLawSchema = z.object({
  titulo: z
    .string()
    .min(5, "Título muy corto (mín 5 caracteres)")
    .max(500, "Título muy largo (máx 500 caracteres)"),
  objetivo: z
    .string()
    .min(10, "Objetivo muy corto (mín 10 caracteres)")
    .max(200, "Objetivo muy largo (máx 200 caracteres)"),
  detalles: z
    .string()
    .max(2000, "Detalles muy largos (máx 2000 caracteres)")
    .optional(),
  apodo: z.string().max(60, "Apodo muy largo (máx 60 caracteres)").optional(),
  category: z
    .enum(["economic", "social", "political", "environmental", "other"])
    .optional(),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(500).optional(),
});

export const CommentSchema = z.object({
  texto: z
    .string()
    .min(1, "Comentario vacío")
    .max(200, "Comentario muy largo (máx 200 caracteres)"),
});
```

---

## Fase 6: Testing

### Paso 6.1: Tests de Autenticación

**Crear `server/routes/laws.test.ts`**:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { createServer } from "../index";
import * as admin from "firebase-admin";

const app = createServer();

describe("Laws API", () => {
  let token: string;

  // Nota: Requiere usuario de test en Firebase
  beforeAll(async () => {
    const testUser = await admin
      .auth()
      .getUserByEmail("test@leybertad.local")
      .catch(() => null);

    if (!testUser) {
      const created = await admin.auth().createUser({
        email: "test@leybertad.local",
        password: "TestPassword123!",
      });
      token = await admin.auth().createCustomToken(created.uid);
    }
  });

  it("should require authentication to create law", async () => {
    const response = await supertest(app)
      .post("/api/laws")
      .send({
        titulo: "Test Law",
        objetivo: "Test objective",
      });

    expect(response.status).toBe(401);
  });

  it("should validate input schema", async () => {
    const response = await supertest(app)
      .post("/api/laws")
      .set("Authorization", `Bearer ${token}`)
      .send({
        titulo: "ab", // Too short
        objetivo: "Test",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Título muy corto");
  });

  it("should create law with valid data", async () => {
    const response = await supertest(app)
      .post("/api/laws")
      .set("Authorization", `Bearer ${token}`)
      .send({
        titulo: "New Law Proposal",
        objetivo: "To improve the country",
        category: "social",
      });

    expect(response.status).toBe(201);
    expect(response.body.law).toHaveProperty("id");
    expect(response.body.law.titulo).toBe("New Law Proposal");
  });
});
```

### Paso 6.2: Tests de Integridad de Datos

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Data Integrity", () => {
  it("should prevent duplicate votes", async () => {
    const user = await prisma.user.create({
      data: {
        firebaseUid: "test-user",
        email: "test@example.com",
      },
    });

    const law = await prisma.law.create({
      data: {
        titulo: "Test Law",
        objetivo: "Test",
        authorId: user.id,
      },
    });

    // First vote succeeds
    const vote1 = await prisma.vote.create({
      data: { lawId: law.id, userId: user.id },
    });

    // Second vote should fail
    await expect(
      prisma.vote.create({
        data: { lawId: law.id, userId: user.id },
      })
    ).rejects.toThrow();
  });
});
```

---

## Troubleshooting

### Problema: "relation 'laws' does not exist"

**Causa**: Migraciones no ejecutadas

**Solución**:
```bash
npx prisma migrate deploy
# O si es desarrollo:
npx prisma db push
```

### Problema: "Please manually reset your database"

**Causa**: Schema en DB no coincide con Prisma

**Solución** (⚠️ BORRA DATOS):
```bash
# Desarrollo solamente
npx prisma migrate reset
npx prisma db push
```

### Problema: "Invalid token"

**Causa**: Token de Firebase expirado

**Solución**: Implementar refresh token en cliente:

```typescript
// client/lib/api.ts
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  let token = await auth.currentUser?.getIdToken();

  // Forzar refresh si token > 1 hora
  if (auth.currentUser) {
    const metadata = auth.currentUser.metadata;
    if (
      Date.now() - (metadata.issuedAtTime?.getTime() || 0) >
      60 * 60 * 1000
    ) {
      token = await auth.currentUser.getIdToken(true); // force refresh
    }
  }

  // ... resto
}
```

### Problema: "Too many connections"

**Causa**: Connection pool agotado

**Solución**: Usar connection pooling:

```env
# Usar Supabase PgBouncer en producción
DATABASE_URL="postgresql://...?schema=public&connection_limit=5"

# En Prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_DIRECT_URL") // Para migraciones
}
```

### Problema: "Unknown column" after Prisma update

**Causa**: Schema desincronizado

**Solución**:
```bash
# Limpiar generados
rm -rf node_modules/.prisma

# Regenerar
npx prisma generate
npx prisma db push
```

---

## Checklist de Implementación

### Semana 1: Setup
- [ ] Crear proyecto Supabase
- [ ] Instalar Prisma
- [ ] Definir schema
- [ ] Ejecutar primera migración
- [ ] Verificar en Prisma Studio

### Semana 2: Auth + API
- [ ] Implementar middleware de auth
- [ ] Crear rutas con Prisma
- [ ] Añadir validación Zod
- [ ] Actualizar cliente con token
- [ ] Tests básicos

### Semana 3: Migración + QA
- [ ] Crear script de migración
- [ ] Testear migración en dev
- [ ] Documentación actualizada
- [ ] Performance testing
- [ ] Lanzamiento

---

## Próximos Pasos

Una vez terminada esta implementación:

1. **Rate Limiting** → express-rate-limit con Redis
2. **Caching** → Redis para leyes populares
3. **Full-text Search** → PostgreSQL built-in o Meilisearch
4. **Notificaciones** → Pusher o Socket.io
5. **Admin Panel** → AdminJS con Prisma

Consulta `ARCHITECTURE_ROADMAP.md` para el roadmap completo.

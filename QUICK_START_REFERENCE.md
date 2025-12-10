# Leybertad: Referencia Rápida

Guía de consulta rápida para decisiones arquitectónicas y snippets de código listos para copiar/pegar.

---

## 📊 Resumen Ejecutivo

### Estado Actual
- ✅ React + Express + Firebase
- ⚠️ Sin validación de autenticación en backend
- ⚠️ DB híbrida (Firestore + JSON local)
- ⚠️ Sin control de acceso

### Recomendación Principal
Migrar a **Supabase + Prisma** para:
- Seguridad (validación real de auth)
- Escalabilidad (SQL estándar)
- Costo (50x más barato a escala)
- DX (type-safe queries)

### Impacto
- **Esfuerzo**: 3-4 semanas
- **Costo**: $0 desarrollo, ~$25-50/mes producción
- **Riesgo**: Bajo (datos respaldados, rollback posible)
- **ROI**: 10x mejor escalabilidad

---

## 🚀 Implementación Rápida (TL;DR)

### En 30 minutos: Setup básico

```bash
# 1. Crear proyecto Supabase (supabase.com)
# Copiar DATABASE_URL

# 2. Instalar dependencias
pnpm add @prisma/client
pnpm add -D prisma

# 3. Copiar schema.prisma (ver IMPLEMENTATION_GUIDE.md)
# Ajustar DATABASE_URL en .env

# 4. Crear BD
npx prisma db push

# 5. Verificar
npx prisma studio
# Abre en http://localhost:5555
```

### En 2 horas: Auth + rutas básicas

```bash
# 1. Crear middleware (server/middleware/auth.ts)
# Ver IMPLEMENTATION_GUIDE.md paso 3.1

# 2. Actualizar rutas (server/routes/laws.ts)
# Ver IMPLEMENTATION_GUIDE.md paso 5.1

# 3. Enviar token desde cliente (client/lib/api.ts)
# Ver IMPLEMENTATION_GUIDE.md paso 3.3

# 4. Tests
pnpm test
```

---

## 📚 Estructura Recomendada del Proyecto

```
leybertad/
├── client/                    # React frontend
│   ├── lib/
│   │   ├── api.ts            # Con token auth
│   │   └── firebase.ts       # Sin cambios
│   ├── pages/                # Sin cambios
│   └── components/           # Sin cambios
│
├── server/                    # Express backend
│   ├── middleware/
│   │   ├── auth.ts           # ✨ NUEVO: validación JWT
│   │   └── errorHandler.ts   # ✨ NUEVO: manejo de errores
│   ├── routes/
│   │   ├── laws.ts           # ✨ CON PRISMA
│   │   ├── profile.ts        # ✨ CON PRISMA
│   │   └── comments.ts       # ✨ NUEVO (si separado)
│   ├── scripts/
│   │   └── migrate.ts        # ✨ NUEVO: migración datos
│   └── index.ts              # Con middleware de auth
│
├── prisma/
│   ├── schema.prisma         # ✨ NUEVO: definición BD
│   └── migrations/           # Auto-generado
│
├── shared/                    # Tipos compartidos
│   ├── api.ts                # Sin cambios
│   └── schemas.ts            # ✨ NUEVO: Zod schemas
│
└── .env                       # DATABASE_URL, FIREBASE_*
```

---

## 🔐 Flujo de Autenticación (Nuevo)

### Antes
```
Cliente                    Backend              BD
  │                          │                  │
  ├─ Obtiene UID Firebase    │                  │
  ├─ Envía UID en header     │                  │
  │──────────────────────────>                  │
  │                          │ Confía en UID    │
  │                          │ (¡INSEGURO!)     │
  │                          │──────────────────>
  │                          │ Crea/actualiza   │
  │<──────────────────────────                  │
  │ Respuesta                │                  │
```

### Después ✅
```
Cliente                    Backend              Firebase    BD
  │                          │                     │         │
  ├─ Auth Firebase           │                     │         │
  │ Obtiene JWT token        │                     │         │
  │                          │                     │         │
  │ Envía JWT en header      │                     │         │
  │──────────────────────────>                     │         │
  │                          ├─ Valida JWT ────────>         │
  │                          │<──────────────────────        │
  │                          │ Token válido + UID            │
  │                          │                               │
  │                          │ Busca/crea usuario ────────────>
  │                          │<───────────────────────────────
  │<──────────────────────────                               │
  │ Respuesta segura         │                              │
```

---

## 💻 Snippets de Código Listos

### 1. Cliente: Obtener Token y Hacer Request

```typescript
// client/lib/api.ts
import { auth } from "@/lib/firebase";

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  // 1. Obtener token de Firebase
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  
  const token = await user.getIdToken();

  // 2. Hacer request con token
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // 3. Manejar errores
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Uso
export const createLaw = (data) => 
  apiFetch("/api/laws", { method: "POST", body: JSON.stringify(data) });

export const upvoteLaw = (id) => 
  apiFetch(`/api/laws/${id}/upvote`, { method: "POST" });
```

### 2. Backend: Validar Token

```typescript
// server/middleware/auth.ts
import { RequestHandler } from "express";
import * as admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    // 1. Obtener token del header
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // 2. Verificar con Firebase Admin SDK
    const decoded = await admin.auth().verifyIdToken(token);

    // 3. Crear/obtener usuario en BD
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email || "",
          displayName: decoded.name,
        },
      });
    }

    // 4. Attach a request
    req.uid = decoded.uid;
    req.user = user;

    next();
  } catch (err: any) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Tipos para TypeScript
declare global {
  namespace Express {
    interface Request {
      uid?: string;
      user?: any;
    }
  }
}
```

### 3. Backend: Crear Ley (Con Validación)

```typescript
// server/routes/laws.ts
import { RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";
import { CreateLawSchema } from "@shared/schemas";

const prisma = new PrismaClient();

export const createLaw: RequestHandler = async (req, res) => {
  try {
    // 1. Validar datos
    const validated = CreateLawSchema.parse(req.body);

    // 2. Crear en BD (usuario ya está autenticado en middleware)
    const law = await prisma.law.create({
      data: {
        ...validated,
        authorId: req.user.id, // ✅ Usar usuario autenticado
      },
      include: {
        author: { select: { displayName: true } },
        _count: { select: { votes: true, saves: true } },
      },
    });

    // 3. Responder
    res.status(201).json({
      law: {
        ...law,
        upvotes: law._count.votes,
        saves: law._count.saves,
        comentarios: [],
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
```

### 4. Frontend: Hook para Crear Ley

```typescript
// client/hooks/useCreateLaw.ts
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createLaw } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useCreateLaw() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: createLaw,
    onSuccess: (data) => {
      toast({
        title: "✅ Ley creada",
        description: "Tu propuesta ha sido publicada",
      });
      // Invalidar queries para refrescar lista
      queryClient.invalidateQueries({ queryKey: ["laws"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Uso en componente
function CreateLawForm() {
  const { mutate, isPending } = useCreateLaw();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutate({
          titulo: e.currentTarget.titulo.value,
          objetivo: e.currentTarget.objetivo.value,
        });
      }}
    >
      {/* form fields */}
      <button disabled={isPending}>
        {isPending ? "Creando..." : "Crear"}
      </button>
    </form>
  );
}
```

---

## 🗄️ Schema Prisma (Simplificado)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  firebaseUid  String    @unique
  email        String    @unique
  displayName  String?
  username     String?   @unique
  createdAt    DateTime  @default(now())

  laws         Law[]
  votes        Vote[]
  saves        Save[]
  comments     Comment[]

  @@index([firebaseUid])
}

model Law {
  id        String    @id @default(cuid())
  titulo    String
  objetivo  String
  detalles  String?
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  
  comments  Comment[]
  votes     Vote[]
  saves     Save[]
  createdAt DateTime  @default(now())

  @@index([authorId])
  @@index([createdAt])
}

model Comment {
  id        String    @id @default(cuid())
  texto     String
  law       Law       @relation(fields: [lawId], references: [id], onDelete: Cascade)
  lawId     String
  author    User?     @relation(fields: [authorId], references: [id])
  authorId  String?
  createdAt DateTime  @default(now())

  @@index([lawId])
}

model Vote {
  id        String    @id @default(cuid())
  law       Law       @relation(fields: [lawId], references: [id], onDelete: Cascade)
  lawId     String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  
  @@unique([lawId, userId])  // Prevenir duplicados
}

model Save {
  id        String    @id @default(cuid())
  law       Law       @relation(fields: [lawId], references: [id], onDelete: Cascade)
  lawId     String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  
  @@unique([lawId, userId])
}
```

---

## 🔄 Comparativa de Enfoques

### Opción A: Mantener Firestore (ACTUAL)

| Pro | Contra |
|-----|--------|
| ✅ Ya implementado | ❌ NoSQL es complicado para redes sociales |
| ✅ Auth integrada | ❌ Caro a escala ($$$) |
| ✅ Sin backend DB | ❌ Difícil queries complejas |
| | ❌ Sin seguridad real |

**Recomendación**: Usa solo si <10k usuarios mensual

---

### Opción B: Migrar a Supabase (RECOMENDADO) ✅

| Pro | Contra |
|-----|--------|
| ✅ SQL estándar | ⚠️ Requiere migración |
| ✅ Económico | ⚠️ Managed pero requiere setup |
| ✅ Prisma support | |
| ✅ Type-safe queries | |
| ✅ Mejor para redes sociales | |

**Recomendación**: Usa para cualquier escala

---

### Opción C: Neon (PostgreSQL Serverless)

| Pro | Contra |
|-----|--------|
| ✅ Serverless (escala auto) | ⚠️ Más nuevo (menos estable) |
| ✅ PostgreSQL estándar | ⚠️ Pricing puede ser confuso |
| ✅ Económico | |

**Recomendación**: Alternativa si quieres serverless puro

---

## 📋 Validación con Zod

```typescript
// shared/schemas.ts
import { z } from "zod";

export const CreateLawSchema = z.object({
  titulo: z
    .string()
    .min(5, "Mín 5 caracteres")
    .max(500, "Máx 500 caracteres"),
  objetivo: z
    .string()
    .min(10, "Mín 10 caracteres")
    .max(200, "Máx 200 caracteres"),
  detalles: z
    .string()
    .max(2000, "Máx 2000 caracteres")
    .optional(),
  apodo: z
    .string()
    .max(60, "Máx 60 caracteres")
    .optional(),
});

// Uso en API
try {
  const valid = CreateLawSchema.parse(req.body);
  // ... rest
} catch (err) {
  if (err instanceof ZodError) {
    return res.status(400).json({ errors: err.errors });
  }
}
```

---

## 🛠️ Herramientas Útiles

### Desarrollo

| Herramienta | Comando | Propósito |
|-------------|---------|----------|
| Prisma Studio | `npx prisma studio` | UI visual de BD |
| Prisma Format | `npx prisma format` | Formatear schema |
| Generate Client | `npx prisma generate` | Regenerar tipos |
| Migrate Dev | `npx prisma migrate dev` | Dev + crear migration |

### Producción

| Herramienta | Comando | Propósito |
|-------------|---------|----------|
| Deploy Migration | `npx prisma migrate deploy` | Aplicar migraciones |
| Reset (⚠️) | `npx prisma migrate reset` | Limpiar todo (dev only) |

### Testing

```bash
# Crear usuario de test en Firebase
firebase auth:import users.json --hash-algo=scrypt

# Ejecutar tests
pnpm test

# Tests con coverage
pnpm test -- --coverage
```

---

## 🚨 Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `relation 'laws' does not exist` | Migraciones no ejecutadas | `npx prisma migrate deploy` |
| `P2002: Unique constraint failed` | Duplicado (email, username) | Validar en cliente antes |
| `P2025: Record not found` | ID inexistente | Añadir `.catch()` o verificar ID |
| `ECONNREFUSED` | BD desconectada | Verificar DATABASE_URL |
| `Invalid token` | Token expirado | Solicitar uno nuevo al cliente |
| `403 Forbidden` | No es propietario | Validar `authorId === req.user.id` |

---

## 🌍 Variables de Entorno

### Desarrollo (.env.local)

```env
# Supabase
DATABASE_URL="postgresql://user:password@host:5432/db"

# Firebase
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_DATABASE_URL="..."

# Opcionales
REDIS_URL="..."
SENTRY_DSN="..."
```

### Producción (.env.production)

```env
# Supabase (con pooling para múltiples conexiones)
DATABASE_URL="postgresql://...?sslmode=require&schema=public&connection_limit=5"
DATABASE_DIRECT_URL="postgresql://..."  # Para migraciones

# Firebase (mismo que dev)
VITE_FIREBASE_API_KEY="..."

# Seguridad
NODE_ENV="production"
JWT_SECRET="..."  # Generar con: openssl rand -hex 32
```

---

## 🎯 Próximos Pasos Recomendados

### Corto Plazo (1-2 semanas)
1. ✅ Migrar a Supabase + Prisma
2. ✅ Implementar validación backend
3. ✅ Tests básicos
4. ✅ Deploy a staging

### Medio Plazo (1 mes)
5. 📊 Añadir rate limiting
6. 🔍 Implementar búsqueda
7. 📱 API v2 pública
8. 📊 Analytics

### Largo Plazo (2-3 meses)
9. 🔔 Notificaciones
10. 🎯 Admin panel
11. 📤 Exportación de datos
12. 🌐 Internacionalización

---

## 📞 Soporte y Recursos

### Documentación Oficial
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin)

### Comunidades
- Supabase Discord: https://discord.supabase.com
- Prisma Discord: https://discord.prisma.io
- Firebase Community: https://groups.google.com/g/firebase-talk

### Herramientas
- Prisma Data Proxy: Para serverless
- Supabase Migrations: Auto-backup
- pgAdmin: Cliente PostgreSQL visual

---

## 📝 Licencia y Créditos

Este roadmap se basa en:
- ✅ Arquitectura actual del proyecto
- ✅ Mejores prácticas de Node.js
- ✅ Análisis de proyectos open source similares (Lemmy, Forem, Mastodon)
- ✅ Recomendaciones de escalabilidad

---

**Última actualización**: Diciembre 2025

Para preguntas o sugerencias, consulta la documentación completa en `ARCHITECTURE_ROADMAP.md` y `IMPLEMENTATION_GUIDE.md`.

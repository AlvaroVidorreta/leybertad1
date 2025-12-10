# Leybertad: Arquitectura Backend y Roadmap

## 📋 Tabla de Contenidos

1. [Análisis del Estado Actual](#análisis-del-estado-actual)
2. [Arquitectura Actual](#arquitectura-actual)
3. [Problemas y Limitaciones](#problemas-y-limitaciones)
4. [Mejores Prácticas (Open Source)](#mejores-prácticas-open-source)
5. [Roadmap Estratégico](#roadmap-estratégico)
6. [Implementación Detallada](#implementación-detallada)

---

## Análisis del Estado Actual

### Proyecto
**Leybertad** es una red social de leyes/propuestas legislativas que permite:
- Crear, visualizar y comentar propuestas de leyes
- Sistema de votación (upvotes)
- Sistema de guardado (saves)
- Ranking de propuestas por popularidad
- Perfiles de usuario (nombres, usernames)

### Stack Actual
- **Frontend**: React 18 + React Router 6 + TypeScript + Vite + TailwindCSS
- **Backend**: Express.js (Node.js)
- **Autenticación**: Firebase Auth (con Google OAuth)
- **Base de Datos**: 
  - Primaria: Firebase Firestore (cloud)
  - Fallback: JSON local (`server/data/db.json`)
  - Realtime DB: Firebase para perspectivas/comentarios
- **Almacenamiento**: Firebase Storage (potencial)

---

## Arquitectura Actual

### 1. Flujo de Autenticación

```
┌─────────────────┐
│   Cliente React │
│  (useFirebaseAuth)
└────────┬────────┘
         │
         ├─→ signInWithEmailAndPassword()
         ├─→ signInWithGoogle()  
         ├─→ signInAnonymously()
         └─→ onAuthStateChanged() [listener]
         │
         ▼
    ┌─────────────────────┐
    │  Firebase Auth      │
    │  - Email/Password   │
    │  - Google OAuth     │
    │  - Anonymous Auth   │
    └─────────────────────┘
         │
    Almacena: UID, email, displayName, photo
```

**Características Actuales**:
- ✅ Autenticación cliente-lado
- ✅ Soporte multi-proveedor (Email, Google, Anonymous)
- ✅ Token gestionado automáticamente por Firebase
- ❌ Sin validación de token en backend
- ❌ Sin autorización granular
- ❌ Identidades anónimas no sincronizadas entre dispositivos

### 2. Flujo de Datos

```
┌──────────────────────────────────────────┐
│         Cliente React                    │
│  - Fetch API a /api/laws, /api/profile  │
│  - Obtiene UID de Firebase Auth         │
└────────────────┬─────────────────────────┘
                 │ API calls (JSON)
                 ▼
┌──────────────────────────────────────────┐
│         Express Backend                  │
│  - Routes: /api/laws, /api/profile, etc  │
│  - Lógica de negocio (votación, guardado)
│  - Rate limiting por visitor ID          │
└────────────┬─────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────────┐  ┌─────────────────────┐
│  Firestore   │  │  JSON local (dev)   │
│  - laws      │  │  - db.json          │
│  - profiles  │  │  - Fallback         │
│  - votes*    │  │  - Testing          │
└──────────────┘  └─────────────────────┘
```

**Características Actuales**:
- ✅ Backend sin estado (stateless)
- ✅ Soporte híbrido (Firestore + local JSON)
- ✅ Fallback automático a JSON si Firestore falla
- ❌ Sin validación real de autenticación en backend
- ❌ Visitor ID es un string aleatorio sin vinculación a usuario
- ❌ Sin control de acceso (cualquiera puede actualizar cualquier cosa)

### 3. Modelos de Datos

```typescript
// Law (Propuesta)
{
  id: string                        // UUID o Firestore ID
  titulo: string                    // Título de la ley (max 500 chars)
  objetivo: string                  // Objetivo (max 200 chars)
  detalles?: string                 // Perspectiva personal (max 2000 chars)
  apodo?: string                    // Nick opcional (max 60 chars)
  createdAt: string                 // ISO date
  upvotes: number
  saves: number
  comentarios: Comment[]
  // Server-only
  authorVisitor: string             // Visitor ID del creador
}

// Comment
{
  id: string
  texto: string                     // (max 200 chars)
  createdAt: string
  author?: string                   // Opcional: nombre del comentarista
}

// Profile
{
  displayName?: string
  username?: string
  saved?: string[]                  // IDs de leyes guardadas
}
```

**Limitaciones**:
- ❌ No hay vínculo explícito entre Law.authorVisitor y Profile
- ❌ No hay field de `updatedAt` para ediciones
- ❌ No hay soft-delete o estado de ley
- ❌ No hay tracking de ediciones

---

## Problemas y Limitaciones

### 1. Autenticación y Seguridad

| Problema | Impacto | Severidad |
|----------|---------|-----------|
| **Sin validación de token en backend** | Cualquiera puede suplantar a otro usuario | 🔴 Alta |
| **Visitor ID = string aleatorio** | No persiste entre sesiones | 🔴 Alta |
| **Sin autorización granular** | No hay control de acceso (ACL) | 🔴 Alta |
| **Anonymous users no sincronizados** | Pierden datos al cambiar dispositivo | 🟠 Media |
| **Sin autenticación multi-factor** | Vulnerable a fuerza bruta (Firebase limita) | 🟡 Baja |

### 2. Base de Datos

| Problema | Impacto | Severidad |
|----------|---------|-----------|
| **Firestore sin índices compuestos** | Queries fallan, fallback a JSON | 🟠 Media |
| **Hybrid sync complexity** | Difícil mantener consistencia | 🟠 Media |
| **Sin transacciones cliente** | Race conditions en upvotes/saves | 🟠 Media |
| **Datos anidados (comentarios en array)** | Problemas de escalabilidad | 🟡 Baja |

### 3. API y Validación

| Problema | Impacto | Severidad |
|----------|---------|-----------|
| **Sin validación de inputs** | Inyección de datos (aunque JSON es "safe") | 🟠 Media |
| **Rate limiting básico** (5 leyes/día) | No escalable | 🟡 Baja |
| **Sin paginación** | Descarga todo a memoria | 🟠 Media |
| **Sin versionado de API** | Cambios rompentes | 🟡 Baja |

### 4. Escalabilidad

| Problema | Impacto | Severidad |
|----------|---------|-----------|
| **Lectura de TODO los datos** | O(n) en ranking y listado | 🟠 Media |
| **Sin caché** | Queries repetidas sin caché | 🟠 Media |
| **Sin limpieza de datos** | DB crece indefinidamente | 🟡 Baja |

---

## Mejores Prácticas (Open Source)

### 1. Autenticación Moderna

**Referencias**: NextAuth.js, Supabase Auth, Firebase Auth (con validación backend)

```
Arquitectura Recomendada:
┌─────────────────────────┐
│  Cliente                │
│  - Obtiene JWT/session  │
│  - Envía en Authorization header
└────────────┬────────────┘
             │
    ┌────────┴──────────────────┐
    │ Authorization Middleware  │
    │ - Valida JWT              │
    │ - Verifica issuer/subject │
    └────────────┬──────────────┘
                 │
             ✅ Autorizado → Ruta
             ❌ No autorizado → 401/403
```

**Implementación**:
```typescript
// Middleware que valida JWT
const validateAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;  // Attach UID to request
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/api/laws", validateAuth, createLaw);
```

### 2. Base de Datos Escalable

**Referencias**: Prisma, Drizzle ORM, Supabase (PostgreSQL)

**Comparativa**:

| Opción | Ventajas | Desventajas | Recomendación |
|--------|----------|-------------|----------------|
| **Firebase Firestore** | Managed, escalable, real-time | Caro a escala, consultas limitadas, NoSQL | Prototipos rápidos |
| **Supabase (PostgreSQL)** | SQL estándar, económico, flexible | Requiere gestión (aunque managed) | ✅ Mejor para redes sociales |
| **Neon (PostgreSQL Serverless)** | Serverless, SQL, autoscaling | Más reciente (menos maduro) | Alternativa moderna |
| **PlanetScale (MySQL)** | Horizontal sharding automático | MySQL (menos flexible) | Escalas masivas |
| **MongoDB Atlas** | Flexible, bueno para documentos | Transacciones débiles (en Firestore es nativo) | Datos semi-estructurados |

**Recomendación**: Supabase con PostgreSQL

```sql
-- Schema recomendado
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  detalles TEXT,
  apodo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ -- soft delete
);

CREATE TABLE law_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE law_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(law_id, user_id) -- prevent duplicate votes
);

CREATE TABLE law_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(law_id, user_id) -- prevent duplicate saves
);

-- Índices para queries frecuentes
CREATE INDEX idx_laws_author_id ON laws(author_id);
CREATE INDEX idx_laws_created_at ON laws(created_at DESC);
CREATE INDEX idx_law_votes_user_id ON law_votes(user_id);
CREATE INDEX idx_law_votes_law_id ON law_votes(law_id);
CREATE INDEX idx_law_comments_law_id ON law_comments(law_id);
```

### 3. ORM/Query Builder

**Recomendación**: Prisma (mejor DX, type-safe)

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  firebaseUid String @unique
  email     String   @unique
  displayName String?
  username  String?  @unique
  laws      Law[]
  votes     Vote[]
  saves     Save[]
  comments  Comment[]
}

model Law {
  id        String   @id @default(cuid())
  titulo    String
  objetivo  String
  detalles  String?
  apodo     String?
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  comments  Comment[]
  votes     Vote[]
  saves     Save[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Con Prisma
const law = await prisma.law.create({
  data: {
    titulo: "...",
    author: { connect: { firebaseUid: user.uid } }
  }
});

const ranking = await prisma.law.findMany({
  orderBy: { votes: { _count: 'desc' } },
  include: { _count: { select: { votes: true } } }
});
```

### 4. Validación

**Recomendación**: Zod (ya está en el proyecto)

```typescript
// shared/schemas.ts
import { z } from "zod";

export const CreateLawSchema = z.object({
  titulo: z.string().min(5).max(500),
  objetivo: z.string().min(10).max(200),
  detalles: z.string().max(2000).optional(),
  apodo: z.string().max(60).optional(),
  category: z.enum(["economic", "social", "political"]).optional(),
});

export type CreateLawInput = z.infer<typeof CreateLawSchema>;

// server/routes/laws.ts
export const createLaw: RequestHandler = async (req, res) => {
  try {
    const validated = CreateLawSchema.parse(req.body);
    // ... rest of logic
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors });
    }
  }
};
```

### 5. Autorización (RBAC)

**Recomendación**: Casbin o middleware personalizado

```typescript
// Middleware simple
const authorize = (requiredRole: string) => 
  async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: req.uid }
    });
    
    if (user?.role !== requiredRole && user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    req.user = user;
    next();
  };

// Uso
app.delete("/api/laws/:id", validateAuth, authorize("admin"), deleteLaw);
```

### 6. Rate Limiting

**Recomendación**: express-rate-limit (con Redis en producción)

```typescript
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "redis";

const redisClient = redis.createClient();

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:"
  }),
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 5, // 5 creaciones por usuario por día
  keyGenerator: (req) => req.uid // Use UID, not IP
});

app.post("/api/laws", validateAuth, limiter, createLaw);
```

### 7. Caching

**Recomendación**: Redis + Cache-Control headers

```typescript
// Caché de leyes más recientes
const cacheKey = "laws:recent:1";
const cached = await redis.get(cacheKey);

if (cached) return res.json(JSON.parse(cached));

const laws = await prisma.law.findMany({ 
  take: 20, 
  orderBy: { createdAt: 'desc' },
  include: { _count: { select: { votes: true, saves: true } } }
});

await redis.setex(cacheKey, 300, JSON.stringify(laws)); // 5 min TTL
res.header("Cache-Control", "public, max-age=300");
res.json(laws);
```

### 8. Logging y Monitoring

**Recomendación**: Pino (logging) + Sentry (error tracking)

```typescript
import pino from "pino";
import * as Sentry from "@sentry/node";

const logger = pino();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [new Sentry.Integrations.Http({ tracing: true })],
});

app.post("/api/laws", validateAuth, createLaw);

try {
  await db.createLaw(data, req.uid);
} catch (err) {
  logger.error(err);
  Sentry.captureException(err);
  res.status(500).json({ error: "Internal server error" });
}
```

---

## Roadmap Estratégico

### Fase 1: Consolidación Segura (2-3 semanas)

**Objetivo**: Asegurar la aplicación y mejorar la base de datos

#### 1.1 Autenticación Backend ✅
- [ ] Middleware de validación de JWT con Firebase Admin SDK
- [ ] Vincular usuario Firebase con tabla `users` en DB
- [ ] Reemplazar "visitor ID" con UID autenticado
- [ ] Validación en todos los endpoints

#### 1.2 Migración a Supabase PostgreSQL
- [ ] Crear DB en Supabase con esquema propuesto
- [ ] Usar Prisma como ORM
- [ ] Migración de datos desde Firestore/JSON
- [ ] Eliminar lógica de fallback (Firestore/JSON)

#### 1.3 Validación de Inputs
- [ ] Aplicar Zod en todos los endpoints
- [ ] Documentar errores esperados

**Deliverables**:
- Autenticación segura funcionando
- DB PostgreSQL en Supabase
- Tests pasando
- Documentación de API actualizada

### Fase 2: Escalabilidad (2-3 semanas)

**Objetivo**: Preparar la app para crecer

#### 2.1 Rate Limiting y Caching
- [ ] Implementar express-rate-limit
- [ ] Redis para persistencia de rate limits
- [ ] Caché de leyes populares

#### 2.2 Paginación
- [ ] Agregar offset/limit a listRecent y ranking
- [ ] Cursor-based pagination para feeds

#### 2.3 Optimizaciones de BD
- [ ] Índices necesarios
- [ ] Denormalización inteligente (counts)
- [ ] Archivado de leyes antiguas

**Deliverables**:
- App puede manejar 10x más usuarios
- Respuestas más rápidas
- Datos inconsistentes reducidos

### Fase 3: Características (3-4 semanas)

**Objetivo**: Añadir funcionalidad social

#### 3.1 Perfiles
- [ ] Página de perfil con leyes creadas
- [ ] Estadísticas del usuario (creaciones, votos, guardados)
- [ ] Followers/following (opcional)

#### 3.2 Busca y Filtros
- [ ] Full-text search en títulos/objetivos
- [ ] Filtros por categoría
- [ ] Ordenamiento (reciente, popular, trending)

#### 3.3 Notificaciones
- [ ] Cuando alguien vota tu ley
- [ ] Comentarios en leyes guardadas
- [ ] Respuestas a comentarios

#### 3.4 Sistema de Confianza (Reputación)
- [ ] Score de usuario basado en votaciones recibidas
- [ ] Badges (ej: "Autor Verificado")
- [ ] Límites más altos para usuarios confiables

**Deliverables**:
- Perfiles con historial
- Búsqueda funcional
- Notificaciones básicas
- Sistema de reputación simple

### Fase 4: Monetización y Sostenibilidad (4+ semanas)

**Objetivo**: Hacer la app autosustentable

#### 4.1 Analytics
- [ ] Integrar Google Analytics o Plausible
- [ ] Tracking de eventos (crear ley, votación, etc.)

#### 4.2 Exportación de Datos
- [ ] Exportar leyes a PDF
- [ ] Reportes por categoría
- [ ] API pública (con rate limit)

#### 4.3 Moderación
- [ ] Sistema de reportes de contenido
- [ ] Panel de admin
- [ ] Soft-delete de leyes/comentarios

#### 4.4 Newsletters/Content
- [ ] Email con leyes semanales más votadas
- [ ] Resúmenes personalizados
- [ ] Integración con Zapier

**Deliverables**:
- Datos sobre qué funciona
- Exportación de contenido
- Control editorial
- Engagement mejorado

---

## Implementación Detallada

### Paso 1: Preparar Supabase

```bash
# 1. Crear proyecto en Supabase
# 2. Copiar DATABASE_URL
# 3. Instalar cliente
pnpm add @supabase/supabase-js @prisma/client
pnpm add -D prisma

# 4. Inicializar Prisma
npx prisma init

# 5. Configurar .env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Paso 2: Definir Schema Prisma

```bash
# Ver schema.prisma en SCHEMA_EJEMPLO.txt (más abajo)
npx prisma db push
npx prisma generate
```

### Paso 3: Middleware de Auth

```typescript
// server/middleware/auth.ts
import { RequestHandler } from "express";
import * as admin from "firebase-admin";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

declare global {
  namespace Express {
    interface Request {
      uid?: string;
      email?: string;
    }
  }
}
```

### Paso 4: Migrar Rutas

```typescript
// server/routes/laws.ts (versión nueva)
import { RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";
import { CreateLawSchema } from "@shared/schemas";
import { requireAuth } from "../middleware/auth";

const prisma = new PrismaClient();

export const createLaw: RequestHandler = async (req, res) => {
  try {
    // 1. Validar input
    const validated = CreateLawSchema.parse(req.body);
    
    // 2. Validar usuario autenticado
    if (!req.uid) return res.status(401).json({ error: "Unauthorized" });
    
    // 3. Obtener usuario o crear
    let user = await prisma.user.findUnique({
      where: { firebaseUid: req.uid }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: { 
          firebaseUid: req.uid, 
          email: req.email || "" 
        }
      });
    }
    
    // 4. Crear ley
    const law = await prisma.law.create({
      data: {
        ...validated,
        author: { connect: { id: user.id } }
      },
      include: { author: true }
    });
    
    res.status(201).json({ law });
  } catch (err) {
    // Manejo de errores...
  }
};
```

### Paso 5: Actualizar Cliente

```typescript
// client/lib/api.ts
export async function createLaw(data: CreateLawInput) {
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch("/api/laws", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
}
```

---

## Recomendaciones Finales

### Stack Recomendado (Producción)

```
┌─────────────────────────────────────────┐
│         Frontend (mismo)                │
│  React 18 + Router 6 + TailwindCSS      │
│  + Zustand (state) + React Query        │
└──────────────────┬──────────────────────┘
                   │ API JSON + JWT
┌──────────────────┴──────────────────────┐
│         Backend (Express)               │
│  - Middleware: auth, validation, cache  │
│  - Prisma ORM                           │
│  - Error handling + logging (Pino)      │
│  - Rate limiting (Redis)                │
└──────────────────┬──────────────────────┘
                   │ SQL queries
┌──────────────────┴──────────────────────┐
│   Supabase (PostgreSQL)                │
│  - Managed database                     │
│  - Built-in auth (opcional)             │
│  - Real-time subscriptions (opcional)   │
└─────────────────────────────────────────┘

Servicios Complementarios:
├─ Redis: Caching + Rate limiting
├─ Firebase Storage: Avatares, archivos
├─ Sentry: Error tracking
├─ PostHog: Analytics
└─ SendGrid: Emails
```

### Decisiones Clave

| Decisión | Opción A | Opción B | Recomendado |
|----------|----------|----------|-------------|
| **Base de Datos** | Firebase Firestore | Supabase PostgreSQL | ✅ Supabase |
| **ORM** | Ninguno (manual) | Prisma | ✅ Prisma |
| **Autenticación** | Firebase Auth | Auth0 | ✅ Firebase + validación backend |
| **Caching** | Memory (Express) | Redis | ✅ Redis |
| **Real-time** | Firebase RTD | Supabase subscriptions | Opcional |
| **File Storage** | Firebase Storage | S3 (AWS) | ✅ Firebase Storage |
| **Admin Panel** | Custom | AdminJS | ✅ AdminJS |

### Checklist Pre-Producción

- [ ] Autenticación verificada en backend
- [ ] Validación de inputs (Zod)
- [ ] Rate limiting activo
- [ ] Caché configurado (Redis)
- [ ] CORS correctamente configurado
- [ ] HTTPS obligatorio
- [ ] Logging y monitoring (Sentry)
- [ ] Backups automáticos
- [ ] Tests unitarios (>80% coverage)
- [ ] Tests de integración
- [ ] Documentación de API (OpenAPI/Swagger)
- [ ] Plan de versionado de API
- [ ] Política de privacidad y ToS
- [ ] GDPR compliance (delete user data)
- [ ] Moderación de contenido básica

---

## Referencias y Recursos

### Mejor Prácticas (Papers/Blogs)
- [REST API Best Practices](https://restfulapi.net/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OWASP Top 10 API Security](https://owasp.org/www-project-api-security/)

### Open Source Similares
- [Hacker News Clone](https://github.com/HackerNews/API) - Ranking + comentarios
- [Dev.to Backend](https://github.com/forem/forem) - Rails pero con ideas útiles
- [Lemmy](https://github.com/LemmyNet/lemmy) - Red social Rust, open source
- [Mastodon](https://github.com/mastodon/mastodon) - Red social descentralizada

### Librerías Recomendadas
- **ORM**: Prisma, Drizzle
- **Validación**: Zod (ya está), Joi
- **Rate Limiting**: express-rate-limit, Bottleneck
- **Caching**: ioredis, node-cache
- **Logging**: Pino, Winston
- **Error Tracking**: Sentry
- **Testing**: Vitest (ya está), Supertest (APIs)
- **API Docs**: Swagger/OpenAPI, TypeDoc

### Deploy
- **Hosting**: Vercel, Railway, Render
- **Database**: Supabase, Neon, PlanetScale
- **Cache/Queue**: Upstash (Redis serverless)
- **Storage**: Cloudinary, DigitalOcean Spaces

---

## Conclusión

**Leybertad** tiene una base sólida con React + Express + Firebase. El siguiente paso crítico es:

1. **Seguridad primero**: Validar tokens en backend
2. **DB escalable**: Migrar a Supabase + Prisma
3. **Rate limiting**: Proteger contra abuso
4. **Monitoreo**: Saber qué falla en producción

Con estas mejoras, la app estará lista para escalar a miles de usuarios mientras se mantiene el código limpio y mantenible.

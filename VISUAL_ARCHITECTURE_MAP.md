# Visual Architecture Map - Leybertad

Diagramas y visualizaciones para entender rápidamente la arquitectura actual y propuesta.

---

## 🔴 ARQUITECTURA ACTUAL (INSEGURA)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       NAVEGADOR (Cliente)                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ React App + Vite                                             │ │
│  │ - useFirebaseAuth hook                                       │ │
│  │ - Obtiene UID de usuario (string aleatorio)                  │ │
│  │ - Envía UID en payload JSON (sin token)                      │ │
│  │                                                              │ │
│  │ Problem: ❌ Cualquiera puede enviar cualquier UID           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────┬──────────────────────────────────────────────────────┘
              │
              │ POST /api/laws
              │ { titulo: "...", uid: "fake-uid-123" }
              │ (SIN VALIDACIÓN)
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   EXPRESS BACKEND (inseguro)                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ app.post("/api/laws", (req, res) => {                        │ │
│  │   // ⚠️ NO hay validación de token                            │ │
│  │   // ⚠️ Confía ciegamente en req.body.uid                    │ │
│  │   const law = {                                              │ │
│  │     authorVisitor: req.body.uid  // 😱 INSEGURO              │ │
│  │   }                                                           │ │
│  │   // Guarda en BD                                            │ │
│  │ })                                                            │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  🔓 Security: NINGUNA (Confía en cliente)                          │
└─────────────┬──────────────────────────────────────────────────────┘
              │
              │ db.createLaw(law)
              ▼
     ┌─────────────────────┐
     │  Firestore o JSON   │
     │  laws collection    │
     │  ❌ Sin validar     │
     └─────────────────────┘

VULNERABILIDADES:
1. 😱 Suplantación de identidad
2. 😱 Modificación de datos ajenos
3. 😱 No hay rate limiting
4. 😱 Sin logs de auditoría
```

---

## ✅ ARQUITECTURA PROPUESTA (SEGURA)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       NAVEGADOR (Cliente)                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ React App + Firebase Auth (integrado)                        │ │
│  │                                                              │ │
│  │ const token = await user.getIdToken()                        │ │
│  │ fetch("/api/laws", {                                         │ │
│  │   headers: { Authorization: "Bearer " + token }              │ │
│  │ })                                                            │ │
│  │                                                              │ │
│  │ ✅ Token firmado por Firebase                               │ │
│  │ ✅ No se puede falsificar                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────┬──────────────────────────────────────────────────────┘
              │
              │ POST /api/laws
              │ Authorization: Bearer eyJhbGc...
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND (seguro)                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Middleware: requireAuth                                      │ │
│  │                                                              │ │
│  │ const token = req.headers.authorization?.split("Bearer")[1] │
│  │ const decoded = await admin.auth().verifyIdToken(token)     │ │
│  │                                                              │ │
│  │ // Sincronizar con BD                                       │ │
│  │ let user = await prisma.user.findUnique({                   │ │
│  │   where: { firebaseUid: decoded.uid }                       │ │
│  │ })                                                            │ │
│  │                                                              │ │
│  │ req.user = user  // Ahora sabemos QUIÉN es                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Route: createLaw(req, res)                                   │ │
│  │                                                              │ │
│  │ const law = await prisma.law.create({                        │ │
│  │   titulo: req.body.titulo,                                  │ │
│  │   authorId: req.user.id  // ✅ SEGURO: vino del middleware │ │
│  │ })                                                            │ │
│  │                                                              │ │
│  │ res.json(law)                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ✅ Security: FUERTE (Validación en backend)                       │
└─────────────┬──────────────────────────────────────────────────────┘
              │
              │ prisma.law.create()
              │
              ▼
     ┌─────────────────────────────────┐
     │      PostgreSQL (Supabase)      │
     │                                 │
     │  users:                         │
     │    - id (UUID)                  │
     │    - firebaseUid                │
     │    - email                      │
     │    - displayName                │
     │                                 │
     │  laws:                          │
     │    - id (UUID)                  │
     │    - titulo                     │
     │    - authorId (FK → users)      │
     │    - createdAt                  │
     │                                 │
     │  votes: (unique lawId+userId)   │
     │  comments:                      │
     │  saves:                         │
     │                                 │
     │  ✅ Con índices y constraints   │
     │  ✅ ACID transactions            │
     └─────────────────────────────────┘

MEJORAS:
✅ Token validado criptográficamente
✅ Usuario sincronizado con BD
✅ Autorización por recurso
✅ Tipos de dato fijos (no dinámico)
✅ Indices para queries rápidas
✅ Constraints previenen inconsistencias
```

---

## 📊 Comparativa de Flujos

### Flujo Actual (INSEGURO)

```
Usuario A                               Usuario B (Atacante)
    │                                          │
    ├─ Login con Google                       │
    │  → Firebase genera JWT A                │
    │                                          ├─ Abre DevTools
    │                                          ├─ Ve: uid = "user-a-123"
    │                                          │
    │                                          ├─ Falsifica request:
    │                                          │  POST /api/laws
    │                                          │  { uid: "user-a-123" }
    │                                          │
    │  ← Backend NO valida               │
    │  ← Crea ley como si fuera Usuario A ←──┘
    │
    ├─ Ve su ley ❌ PERO ES DE B
    │
    └─ B logró suplantación de identidad
```

### Flujo Nuevo (SEGURO)

```
Usuario A                               Usuario B (Atacante)
    │                                          │
    ├─ Login con Google                       │
    │  → Firebase genera JWT A (firmado)      │
    │                                          ├─ Abre DevTools
    │                                          ├─ Ve: token = "eyJ..."
    │                                          │
    │                                          ├─ Copia token
    │                                          │
    │                                          ├─ Intenta falsificar:
    │                                          │  POST /api/laws
    │                                          │  Authorization: Bearer <fake>
    │                                          │
    │                                          ├─ Backend verifica firma
    │                                          │  con Firebase Public Key
    │                                          │
    │  ✅ Token rechazado            ✗────────┤
    │                                          │
    │  B no logra suplantación                │
    │  (Token = imposible falsificar)         │
    │                                          │
    └─ App es SEGURA                          │
```

---

## 🗂️ Estructura de Carpetas Propuesta

```
leybertad/
│
├── 📁 client/                          (Sin cambios)
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Perfil.tsx
│   │   └── ...
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── ...
│   ├── hooks/
│   │   └── useFirebaseAuth.tsx         (Sin cambios)
│   ├── lib/
│   │   ├── api.ts                      ⬅️ CON TOKEN
│   │   └── firebase.ts                 (Sin cambios)
│   └── global.css
│
├── 📁 server/
│   ├── 📁 middleware/                  ⬅️ NUEVO
│   │   ├── auth.ts                     ⬅️ NUEVO: validar JWT
│   │   └── errorHandler.ts             ⬅️ NUEVO: manejo de errores
│   ├── 📁 routes/
│   │   ├── laws.ts                     ⬅️ CON PRISMA
│   │   ├── profile.ts                  ⬅️ CON PRISMA
│   │   └── comments.ts                 ⬅️ NUEVO: separado
│   ├── 📁 scripts/                     ⬅️ NUEVO
│   │   ├── migrate.ts                  ⬅️ NUEVO: migración datos
│   │   └── seed.ts                     ⬅️ NUEVO: datos iniciales
│   ├── 📁 utils/
│   │   ├── firebaseAdmin.ts
│   │   ├── logger.ts
│   │   └── scoring.ts
│   ├── 📁 data/                        ⬅️ ELIMINAR (solo Firestore)
│   │   └── boe_cache.json
│   ├── db.ts                           ⬅️ ELIMINAR
│   └── index.ts                        ⬅️ CON MIDDLEWARE
│
├── 📁 prisma/                          ⬅️ NUEVO
│   ├── schema.prisma                   ⬅️ NUEVO: definición BD
│   └── migrations/                     ⬅️ AUTO: historial cambios
│
├── 📁 shared/
│   ├── api.ts
│   └── schemas.ts                      ⬅️ NUEVO: Zod validation
│
├── .env                                ⬅️ CON DATABASE_URL
├── package.json
└── ...
```

---

## 🔄 Ciclo de Desarrollo: Antes vs Después

### ANTES (Con Firestore + JSON)

```
1. Cambio en Firestore
   ↓
2. Actualizar schema manual
   ↓
3. Actualizar tipos TypeScript manual
   ↓
4. Escribir tests
   ↓
5. Implementar en rutas
   ↓
6. ¿Fallaron índices? Volver a 1
```

### DESPUÉS (Con Prisma)

```
1. Actualizar prisma/schema.prisma
   ↓
2. npx prisma migrate dev
   ↓
3. ✅ Tipos generados automáticamente
   ↓
4. npx prisma studio
   ↓
5. Escribir rutas (autocomplete!)
   ↓
6. ✅ Índices y constraints automáticos
```

---

## 📈 Escalabilidad: Comparativa

```
                FIRESTORE           POSTGRESQL (SUPABASE)
            ┌─────────────────┬─────────────────────────┐
Usuarios:   │ <10k: $25/mes   │ <10k: $25/mes ✅        │
            │ 100k: $500+/mes │ 100k: $50/mes ✅✅      │
            │ 1M: $5000+/mes  │ 1M: $100/mes ✅✅✅      │
            ├─────────────────┼─────────────────────────┤
Queries:    │ Por documento   │ SQL estándar ✅         │
            │ Limitado/caro   │ Unlimited ✅✅          │
            ├─────────────────┼─────────────────────────┤
Búsqueda:   │ Muy limitada    │ Full-text nativo ✅     │
            │ Usar Algolia    │ PostgreSQL built-in     │
            ├─────────────────┼─────────────────────────┤
Transacciones: │ Limitadas     │ ACID completo ✅✅      │
            ├─────────────────┼─────────────────────────┤
Learning:   │ Específico FB   │ SQL estándar ✅         │
            └─────────────────┴─────────────────────────┘

RECOMENDACIÓN: Supabase para cualquier escala > 10k usuarios
```

---

## 🎯 Matriz de Características por Fase

```
CARACTERÍSTICA              FASE 0   FASE 1   FASE 2   FASE 3
                            (Hoy)    (S1-3)   (S4-7)   (S8+)
────────────────────────────────────────────────────────────────
Validación Auth             ✅
Supabase Setup              ·        ✅
Prisma ORM                  ·        ✅
Migración Datos             ·        ✅
Rate Limiting               ·        ·        ✅
Paginación                  ·        ·        ✅
Búsqueda Full-text          ·        ·        ·        ✅
Notificaciones              ·        ·        ·        ✅
Admin Panel                 ·        ·        ·        ✅
Reputación/Karma            ·        ·        ·        ✅
Moderación                  ·        ·        ·        ✅

LEYENDA: ✅ = Implementado   · = Por hacer
```

---

## 💾 Modelos de Datos

### Actual (Firestore/JSON)

```
Firestore:
  /laws/{lawId}
    - titulo
    - objetivo
    - detalles
    - authorVisitor (string: "random-uuid")  ⚠️ No vinculado
    - createdAt
    - upvotes: 42
    - saves: 15
    - comentarios: [
        { id, texto, createdAt }
      ]
    /votes/{voteId}
      - createdAt

  /profiles/{userId}
    - displayName
    - username

❌ PROBLEMAS:
- authorVisitor no vinculado a users
- No hay relaciones formales
- Escalabilidad limitada
- Comentarios anidados (array)
```

### Propuesto (PostgreSQL)

```
PostgreSQL (Supabase):

users:
  ├─ id (UUID PK)
  ├─ firebaseUid (unique)
  ├─ email (unique)
  ├─ displayName
  └─ username (unique)

laws:
  ├─ id (UUID PK)
  ├─ titulo
  ├─ objetivo
  ├─ detalles
  ├─ authorId (FK → users.id)  ✅ Relación formal
  ├─ createdAt
  ├─ updatedAt
  └─ deletedAt (soft delete)

comments:
  ├─ id (UUID PK)
  ├─ texto
  ├─ lawId (FK → laws.id)
  ├─ authorId (FK → users.id)
  └─ createdAt

votes:
  ├─ id (UUID PK)
  ├─ lawId (FK → laws.id)
  ├─ userId (FK → users.id)
  ├─ UNIQUE(lawId, userId)
  └─ createdAt

✅ VENTAJAS:
- Relaciones formales con FK
- Type-safe con Prisma
- Indexes automáticos
- Constraints previenen bugs
```

---

## 📡 API Contracts: Antes vs Después

### Antes (Inseguro)

```typescript
POST /api/laws
Content-Type: application/json

{
  "titulo": "Nueva ley",
  "objetivo": "Mejorar el país",
  "detalles": "...",
  "uid": "random-string"  ⚠️ Fácil de falsificar
}

⚠️ El servidor confía en uid
```

### Después (Seguro)

```typescript
POST /api/laws
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "titulo": "Nueva ley",
  "objetivo": "Mejorar el país",
  "detalles": "..."
}

✅ El servidor valida token
✅ Extrae uid del token
✅ No confía en cliente
```

---

## 🚀 Migration Path Timeline

```
Hoy                 2 semanas            3 semanas          4 semanas
│                   │                    │                  │
├─ FASE 0          ├─ FASE 1 START      ├─ FASE 1 QA       ├─ FASE 1 PROD
│ Auth Validation   │ Setup Supabase     │ Tests            │ Go Live
│                   │ Prisma Schema     │ Migración datos   │ Kill Firestore
│                   │ Rutas nuevas       │ Docs updated     │ Celebrate
│                   │                    │                  │
└──────────────────┴────────────────────┴──────────────────┴─► Producción Segura
```

---

## 🎯 Checklist Visual

### SEMANA 0 (HOY)

```
TAREA                                          ESTADO      TIEMPO
┌────────────────────────────────────────────┬───────────┬────────┐
│ Leer documentos                             │ ⬜⬜⬜⬜  │ 30m    │
│ Crear cuenta Supabase                       │ ⬜⬜⬜⬜  │ 10m    │
│ Decidir si proceder                         │ ⬜⬜⬜⬜  │ 20m    │
│ Implementar auth validation (FASE 0)        │ ⬜⬜⬜⬜  │ 2h     │
│ Test y deploy FASE 0                        │ ⬜⬜⬜⬜  │ 30m    │
└────────────────────────────────────────────┴───────────┴────────┘
```

### SEMANA 1-3 (FASE 1)

```
TAREA                                          ESTADO      TIEMPO
┌────────────────────────────────────────────┬───────────┬────────┐
│ Setup Prisma & Supabase                     │ ⬜⬜⬜⬜  │ 2h     │
│ Migrar schema & datos                       │ ⬜⬜⬜⬜  │ 3h     │
│ Reescribir routes con Prisma                │ ⬜⬜⬜⬜  │ 6h     │
│ Actualizar cliente con token                │ ⬜⬜⬜⬜  │ 2h     │
│ Tests integrales                            │ ⬜⬜⬜⬜  │ 4h     │
│ Deploy a staging                            │ ⬜⬜⬜⬜  │ 1h     │
│ QA & fixes                                  │ ⬜⬜⬜⬜  │ 4h     │
│ Deploy a producción                         │ ⬜⬜⬜⬜  │ 1h     │
│ Limpieza y docs finales                     │ ⬜⬜⬜⬜  │ 2h     │
└────────────────────────────────────────────┴───────────┴────────┘

TOTAL: ~25 horas de desarrollo
       ~3 semanas de implementación
```

---

## 🔗 Interdependencias

```
                    FASE 0: Auth Validation
                            │
                            ├─ CRÍTICO
                            ├─ Hace app más segura inmediatamente
                            ├─ Depende de: Firebase Admin SDK
                            └─ Bloquea: Nada (independiente)
                            │
                            ▼
                    FASE 1: Supabase + Prisma
                            │
                            ├─ Depende de: FASE 0 completada
                            ├─ Requiere: Nueva BD, migración datos
                            ├─ Bloquea: FASE 2 (caché, paginación)
                            └─ Duración: 3 semanas
                            │
                            ▼
                    FASE 2: Escalabilidad
                            │
                            ├─ Rate Limiting
                            ├─ Paginación
                            ├─ Caché
                            └─ Duración: 2 semanas
                            │
                            ▼
                    FASE 3: Features
                            │
                            ├─ Notificaciones
                            ├─ Admin Panel
                            ├─ Reputación
                            └─ Duración: 3+ semanas
```

---

## ✨ Beneficios Finales

```
ACTUAL                          PROPUESTO
├─ ❌ Inseguro                  ├─ ✅ Seguro (JWT validado)
├─ ❌ Limitado escalabilidad    ├─ ✅ Escalable (SQL)
├─ ❌ Caro (Firestore)          ├─ ✅ Económico (PostgreSQL)
├─ ❌ No type-safe              ├─ ✅ Type-safe (Prisma)
├─ ❌ Difícil debug             ├─ ✅ Fácil debug (SQL)
├─ ❌ Sin paginación            ├─ ✅ Paginación nativa
├─ ❌ Sin búsqueda              ├─ ✅ Full-text search
├─ ❌ Sin moderación            ├─ ✅ Admin panel
├─ ❌ 1 desarrollador            ├─ ✅ Múltiples devs (es SQL)
└─ ❌ Riesgo de cracking        └─ ✅ Enterprise-ready

IMPACTO: De startup vulnerable a plataforma profesional
```

---

## 📚 Resumen Documento Completo

| Documento | Propósito | Lectores |
|-----------|-----------|----------|
| **ARCHITECTURE_ROADMAP.md** | Análisis profundo + mejores prácticas | Arquitectos, Tech Leads |
| **IMPLEMENTATION_GUIDE.md** | Paso a paso con código completo | Developers (backend) |
| **QUICK_START_REFERENCE.md** | Snippets + referencia rápida | Developers (frontend) |
| **PRIORITIZATION_MATRIX.md** | Qué hacer primero y por qué | PMs, Álvaro |
| **VISUAL_ARCHITECTURE_MAP.md** | Diagramas y visualizaciones | Todos |

---

## 🎬 Próximo Paso

👉 **Leer:** `PRIORITIZATION_MATRIX.md` (10 min)
👉 **Decidir:** ¿Implementar FASE 0 hoy?
👉 **Actuar:** Crear cuenta Supabase si sí

---

*Documento visual - Arquitectura Leybertad*
*Última actualización: Diciembre 2025*
*Status: ✅ Completo y listo para implementación*

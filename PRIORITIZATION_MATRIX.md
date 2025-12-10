# Matriz de Priorización: Leybertad Backend Improvements

Guía visual para entender QUÉ hacer, CUÁNDO y POR QUÉ.

---

## 🎯 Decisión Estratégica Principal

```
┌─────────────────────────────────────────────────────────────┐
│                    HOY: AUDITORÍA CRÍTICA                   │
│                                                             │
│  "El proyecto está inseguro. Cualquiera puede falsificar   │
│   la identidad de otro usuario."                            │
│                                                             │
│  El backend no valida quién es el usuario.                 │
│  Solo confía en lo que el cliente envía.                    │
│                                                             │
│  ⚠️ RIESGO: CRÍTICO - Alguien puede comentar como si      │
│     fuera otro usuario, borrar leyes ajenas, etc.          │
│                                                             │
│  ✅ SOLUCIÓN URGENTE:                                       │
│     Validar JWT en backend (mitiga en 2 horas)             │
│                                                             │
│  📊 SOLUCIÓN COMPLETA:                                      │
│     Migrar a Supabase + Prisma (3-4 semanas)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Matriz Impacto vs Esfuerzo

```
IMPACTO
   │
   │ 🔴 CRÍTICO      │                    │
   │  - Sin auth     │  🔵 IMPORTANTE     │  ✅ RÁPIDAS
   │  - SQL injection │  - Rate limiting   │  - Caché
   │                 │  - Paginación      │  - Índices
   │                 │                    │
   ├─────────────────┼────────────────────┼────────────────
   │                 │  🟠 MEDIUM         │
   │ 🟡 IMPORTANTE   │  - Notificaciones  │  🟢 NICE-TO-HAVE
   │  - Admin panel  │  - Búsqueda        │  - Dark mode
   │  - Perfiles     │  - Moderación      │  - Analytics
   │                 │                    │
   └─────────────────────────────────────────────────────────> ESFUERZO
     Rápido          Medio                Largo
```

---

## 🔴 FASE 0: EMERGENCIA (HACE YA)

### Problema
Backend NO valida autenticación. Cualquiera puede suplantar a otro usuario.

### Solución Rápida (2 horas)
```typescript
// Añadir en server/index.ts
import * as admin from "firebase-admin";

const verifyToken: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;  // ✅ Ahora sí sabemos quién es
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Aplicar a rutas que modifican datos
app.post("/api/laws", verifyToken, createLaw);
app.post("/api/laws/:id/upvote", verifyToken, upvoteLaw);
app.post("/api/laws/:id/comment", verifyToken, commentLaw);
app.post("/api/profile", verifyToken, profileUpdateHandler);
```

### En Cliente (1 hora)
```typescript
// client/lib/api.ts
export async function apiFetch(endpoint: string, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` }),
    ...options.headers,
  };
  
  return fetch(endpoint, { ...options, headers });
}
```

### Checklist
- [ ] Middleware de verificación en 1 ruta
- [ ] Cliente enviando token
- [ ] Testeado manualmente
- [ ] Documentado

**⏱️ Tiempo**: 2-3 horas  
**🎯 Impacto**: Impide suplantación de identidad

---

## 🟠 FASE 1: CONSOLIDACIÓN (1-3 semanas)

### Problema Principal
BD híbrida (Firestore + JSON) es confusa y no escalable.

### Orden de Implementación

#### Semana 1: Setup & Desarrollo
1. **Crear Supabase** (30 min)
   - [ ] Registrarse en supabase.com
   - [ ] Crear proyecto
   - [ ] Copiar DATABASE_URL

2. **Setup Prisma** (1 hora)
   - [ ] `pnpm add @prisma/client`
   - [ ] `npx prisma init`
   - [ ] Copiar schema.prisma
   - [ ] `npx prisma db push`

3. **Validar Conexión** (30 min)
   - [ ] `npx prisma studio`
   - [ ] Ver BD vacía
   - [ ] Crear 1 usuario manual para test

#### Semana 2: Código Backend
1. **Rutas con Prisma** (2-3 horas)
   - [ ] Reescribir server/routes/laws.ts
   - [ ] Reescribir server/routes/profile.ts
   - [ ] Tests pasando

2. **Eliminar código old** (1 hora)
   - [ ] Remover lógica de Firestore fallback
   - [ ] Remover JSON local (db.json)
   - [ ] Limpiar imports

#### Semana 3: Migración & QA
1. **Migrar Datos** (2 horas)
   - [ ] Crear script de migración
   - [ ] Testeado en dev
   - [ ] Backup de Firestore

2. **Tests Integrales** (2 horas)
   - [ ] Todos los tests pasan
   - [ ] Testeado en staging
   - [ ] Documentación actualizada

### Deliverables
✅ Todo funciona con Prisma + Supabase  
✅ Sin dependencia de Firestore  
✅ Código más limpio y type-safe

---

## 🟡 FASE 2: ESCALABILIDAD (2-4 semanas)

Una vez FASE 1 está en producción.

### 2.1: Rate Limiting (🔥 CRÍTICO para producción)

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,  // 24 horas
  max: 5,  // 5 leyes por usuario por día
  keyGenerator: (req) => req.uid,  // Por usuario, no IP
  message: "Demasiadas leyes creadas hoy",
});

app.post("/api/laws", requireAuth, limiter, createLaw);
```

**Impacto**: Protege contra spam/abuse  
**Esfuerzo**: 1 hora

### 2.2: Paginación

```typescript
// client side
fetch("/api/laws?limit=20&offset=0")

// server side
const limit = Math.min(parseInt(req.query.limit) || 20, 100);
const offset = parseInt(req.query.offset) || 0;

const laws = await prisma.law.findMany({
  skip: offset,
  take: limit,
  orderBy: { createdAt: "desc" }
});
```

**Impacto**: Mejor performance con muchos datos  
**Esfuerzo**: 2 horas

### 2.3: Caché (Opcional para MVP)

```typescript
// Si tenés Redis
const cache = await redis.get("laws:recent");
if (cache) return JSON.parse(cache);

const laws = await prisma.law.findMany(...);
await redis.setex("laws:recent", 300, JSON.stringify(laws));  // 5 min TTL
```

**Impacto**: 10x más rápido  
**Esfuerzo**: 2-3 horas  
**Costo**: +$10/mes (Upstash Redis)

### 2.4: Full-text Search

```typescript
// PostgreSQL nativo (en schema.prisma)
model Law {
  /// @db.Text
  searchField String?

  @@fulltext([titulo, objetivo])  // PostgreSQL extension
}

// Búsqueda
const results = await prisma.law.findMany({
  where: {
    OR: [
      { titulo: { search: "query" } },
      { objetivo: { search: "query" } }
    ]
  }
});
```

**Impacto**: Búsqueda funcionando  
**Esfuerzo**: 1-2 horas

---

## 🎯 FASE 3: FEATURES (3-5 semanas)

Una vez FASE 2 estable.

### 3.1: Sistema de Reputación/Karma
- ✅ Score del usuario (basado en upvotes recibidos)
- ✅ Badges (ej: "Autor Verificado")
- ⏱️ Esfuerzo: 1 semana

### 3.2: Notificaciones
- ✅ Email cuando alguien vota tu ley
- ✅ Dashboard de notificaciones
- ⏱️ Esfuerzo: 1.5 semanas

### 3.3: Administración
- ✅ Panel admin (AdminJS)
- ✅ Moderar contenido
- ✅ Ver estadísticas
- ⏱️ Esfuerzo: 1 semana

### 3.4: Perfiles Mejorados
- ✅ Ver leyes que creó cada usuario
- ✅ Estadísticas personales
- ✅ Followers/Following (opcional)
- ⏱️ Esfuerzo: 3-4 días

---

## 📊 Timeline Realista

```
Hoy          FASE 0         FASE 1         FASE 2         FASE 3
 │ ─────────────────────────────────────────────────────────────────────► 3 meses
 │
 │  ⚠️ Auth        Supabase   Rate limit     Search        Reputación
 │  Validación    + Prisma   + Paginación   + Caché       + Notifs
 │  (Urgente)    (3 semanas) (2-3 semanas)  (1 semana)    (3 semanas)
 │
 │
 ▼ AHORA ────────────────────────────────────────────────────────────────
```

---

## 💰 Costo Estimado

| Componente | Costo | Notas |
|-----------|-------|-------|
| Supabase (BD) | $25/mes | Managed, incluye backups |
| Upstash (Redis) | $10/mes | Cache + rate limiting |
| Firebase (Auth) | $0 | Gratis para <10k usuarios |
| Hosting | $0-20 | Vercel/Railway (incluido en Netlify) |
| **TOTAL** | **~$35/mes** | 50x más barato que Firestore a escala |

---

## 🚦 Status Indicador por Fase

### ✅ COMPLETADO
- React frontend
- Firebase Auth
- Express básico
- Deploy a producción

### 🔴 CRITICO AHORA
- Backend sin validación de auth
- Cualquiera puede suplantar usuarios

### 🟠 URGENTE (1-2 semanas)
- Migrar a Supabase
- Validar tokens en backend
- Tests integrales

### 🟡 IMPORTANTE (1 mes)
- Rate limiting
- Paginación
- Caché

### 🟢 NICE-TO-HAVE (después)
- Notificaciones
- Admin panel
- Full-text search

---

## 🎓 Decisiones Clave Resumidas

### 1️⃣ Base de Datos
**❌ Mantener Firestore**
- Cada ley es lectura cara
- NoSQL es complicado para relaciones
- No escalable para features futuras

**✅ Migrar a Supabase (PostgreSQL)**
- SQL estándar
- Prisma type-safe
- 5x más económico
- Mejor para redes sociales

### 2️⃣ Autenticación
**❌ Confiar en cliente (ACTUAL)**
```
Cliente envía UID → Backend acepta sin validar
```

**✅ Validar JWT en backend (NUEVO)**
```
Cliente envía token → Backend verifica con Firebase
```

### 3️⃣ Autorización
**❌ Sin control** (ACTUAL)
- Cualquiera puede modificar cualquier cosa

**✅ Validar propiedad de recurso** (NUEVO)
```
if (law.authorId !== req.user.id) {
  return res.status(403).json({ error: "Forbidden" });
}
```

### 4️⃣ ORM
**❌ Queries manuales**
- Propenso a errores
- Sin type-safety

**✅ Prisma**
- Auto-complete en IDE
- Migraciones automáticas
- Type-safe queries

---

## 🎬 Próximos Pasos Hoy

### Para Álvaro (2 horas):
1. ✅ Leer estos docs (30 min)
2. ✅ Crear cuenta Supabase (10 min)
3. ✅ Setup local Prisma (30 min)
4. ✅ Copiar schema.prisma (10 min)
5. ✅ Decidir fecha de migración (10 min)

### Para el Equipo (esta semana):
1. ✅ Entender arquitectura propuesta
2. ✅ Hacer FASE 0 (auth validation) en prod
3. ✅ Planificar FASE 1 (Supabase migration)
4. ✅ Crear issues en GitHub/Linear

### Dependencias Externas:
- Nada! Todo con herramientas que ya usan

---

## 📞 Documentación Completa

- **`ARCHITECTURE_ROADMAP.md`** → Análisis detallado + mejores prácticas
- **`IMPLEMENTATION_GUIDE.md`** → Paso a paso con código listo
- **`QUICK_START_REFERENCE.md`** → Snippets y referencia rápida

---

## ✨ Conclusión

**Status**: La app funciona, pero no es segura ni escalable.

**Solución**: 3-4 semanas de refactorización sistemática.

**Resultado**: App 10x más segura y escalable.

**Costo**: ~$35/mes en cloud + 3-4 semanas de desarrollo.

**Riesgo**: Bajo (datos respaldados, rollback posible).

**ROI**: Altísimo (vs. mantener Firestore costoso y complicado).

---

**¿Preguntas?** Consulta los otros docs o crea un issue en el repo.

---

*Última actualización: Diciembre 2025*
*Auditoría: Completa ✅*
*Recomendación: Implementar FASE 0 + FASE 1*

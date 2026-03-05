# Security Checklist - Credifix

Auditoría de seguridad del proyecto. Última actualización: 2026-03-05

---

## Autenticación y Sesiones

- [x] Supabase Auth con email/password correctamente integrado
- [x] Sesión refrescada en cada request via `supabase.auth.getUser()` en middleware
- [x] Cookies `httpOnly` para manejo de sesión (delegado a Supabase)
- [x] Soporte dual: cookies (web) + Bearer token (mobile)
- [x] Rutas protegidas redirigen a sign-in si no hay sesión
- [x] OAuth callback valida código antes de crear sesión
- [x] `signOut` limpia estado y refresca correctamente
- [x] **Contraseña mínima de 8 caracteres** en sign-up y reset-password *(corregido: era 6)*
- [x] **Open redirect corregido** - `redirect_url` y `next` param validados contra paths internos *(corregido en `middleware.ts`, `auth/callback/route.ts`, `sign-in/page.tsx`)*
- [ ] Sin rate limiting en login - Vulnerable a fuerza bruta *(pendiente: requiere infraestructura Redis/Upstash)*
- [ ] Sin bloqueo de cuenta por intentos fallidos *(verificar config en dashboard de Supabase)*

---

## Autorización y Roles

- [x] Roles `admin` / `user` en tabla `profiles`
- [x] `isAdmin()` verifica rol desde DB en cada request
- [x] Todas las rutas admin validan `isAdmin()` antes de procesar
- [x] `getAuthenticatedUser()` usado en todas las rutas protegidas
- [x] userId siempre viene del auth, no del cliente
- [ ] Rol no cacheado - Se consulta DB en cada verificación *(bajo impacto)*
- [ ] Sin logging de acciones admin - No hay audit trail
- [ ] `ai_config` legible por cualquier usuario autenticado - Expone system prompts

---

## Row-Level Security (RLS)

- [x] RLS habilitado en todas las tablas sensibles: `profiles`, `subscriptions`, `conversations`, `messages`, `referrals`, `credit_transactions`, `user_credits`, `referral_codes`
- [x] Políticas de acceso filtran por `auth.uid()` correctamente
- [x] Conversaciones y mensajes scoped por `user_id`
- [x] Soft delete respetado (`deleted_at IS NULL`)
- [x] Organizaciones con membresías y roles (owner, admin, member)
- [ ] Admin client (`createAdminClient`) bypassa RLS - Usado donde server client sería suficiente

---

## API Routes

- [x] Todas las rutas protegidas requieren autenticación
- [x] Validación de input con Zod en rutas principales (checkout, portal, config)
- [x] Errores genéricos devueltos al cliente (sin info leakage)
- [x] `handleApiError()` centralizado para manejo de errores
- [x] Body size limit de 10MB configurado en `next.config.ts`
- [x] **Chat API limita historial a 100 mensajes** para prevenir abuso de costos *(corregido)*
- [x] **Referral validate valida formato de código** con regex antes de consultar DB *(corregido)*
- [ ] Sin rate limiting en endpoints públicos *(pendiente: requiere infraestructura)*
- [ ] Sin CORS explícito - Headers custom no expuestos cross-origin
- [ ] Validación Zod faltante en algunos admin routes (PATCH plans, PUT credit-config)

---

## Stripe y Billing

- [x] Webhook verifica firma con `stripe.webhooks.constructEvent()`
- [x] Claves Stripe solo en server-side (nunca expuestas al cliente)
- [x] Planes gestionados en DB con tabla `plans`
- [x] API endpoints devuelven URLs en vez de redirigir (seguro para mobile)
- [x] Verificación de suscripción activa antes de redimir créditos
- [ ] Cadena de fallback de userId en webhook compleja - Debería fallar rápido
- [ ] Race condition en redención de créditos - Si Stripe falla después de debitar DB
- [ ] Sin concurrency control en endpoint de sync admin

---

## Sistema de Referidos

- [x] Validación de auto-referido (no puedes usar tu propio código)
- [x] Incremento atómico de créditos con `increment_user_credits()`
- [x] Configuración de máximo de referidos por usuario
- [x] **Validación de formato de código** - Solo alfanumérico 3-50 chars *(corregido)*
- [ ] Endpoint de validación público sin rate limiting *(pendiente)*
- [ ] Race condition en completar referido - Doble award posible
- [ ] TOCTOU en max_referrals - Dos signups simultáneos pueden superar el límite

---

## Headers de Seguridad

- [x] **X-Content-Type-Options: nosniff** *(corregido en `next.config.ts`)*
- [x] **X-Frame-Options: DENY** *(corregido)*
- [x] **X-XSS-Protection: 1; mode=block** *(corregido)*
- [x] **Strict-Transport-Security (HSTS)** con max-age 2 años *(corregido)*
- [x] **Referrer-Policy: strict-origin-when-cross-origin** *(corregido)*
- [x] **Permissions-Policy** - Cámara deshabilitada, micrófono solo self *(corregido)*
- [ ] Content-Security-Policy (CSP) completo *(pendiente: requiere auditar scripts inline)*

---

## Upload de Archivos

- [x] Autenticación requerida para subir archivos
- [x] Límite de tamaño: 10MB por archivo
- [x] Máximo 5 archivos por request
- [x] Texto truncado a 50k caracteres para evitar overflow de tokens
- [x] Soporte de PDF, DOCX, XLSX, CSV, TXT con extracción de texto
- [x] Soporte de imágenes removido (no se usa vision)
- [x] **Validación de magic bytes** - Archivos binarios verificados contra su firma real *(corregido)*
- [ ] Sin escaneo de malware/virus
- [ ] Sin rate limiting por usuario en uploads

---

## Audio y Transcripción

- [x] Límite de 25MB para archivos de audio (máximo de Whisper)
- [x] Validación de MIME type para audio
- [x] Autenticación requerida

---

## Secretos y Configuración

- [x] `.env.local` en `.gitignore` (no trackeado)
- [x] `SUPABASE_SERVICE_ROLE_KEY` solo usado server-side
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` intencionalmente público (RLS es la defensa)
- [x] Sin secretos hardcodeados en código fuente
- [x] Stripe webhook secret validado
- [ ] Sin pre-commit hook para detección de secretos
- [ ] Dependencias con vulnerabilidades conocidas - Ejecutar `npm audit fix`

---

## CSRF y XSS

- [x] Cookies `SameSite: lax` proveen protección parcial contra CSRF
- [x] Supabase Auth maneja CSRF internamente
- [x] Inputs validados con Zod (type safety)
- [ ] Sin tokens CSRF explícitos en operaciones de escritura
- [ ] Sin sanitización HTML en contenido renderizado (si aplica)

---

## Resumen de Correcciones Aplicadas

| # | Issue | Severidad | Estado | Archivo(s) |
|---|-------|-----------|--------|------------|
| 1 | Open redirect en redirects post-login | Crítico | Corregido | `middleware.ts`, `auth/callback/route.ts`, `sign-in/page.tsx` |
| 2 | Security headers faltantes | Crítico | Corregido | `next.config.ts` |
| 3 | Contraseña mínima de 6 chars | Crítico | Corregido (8) | `sign-up/page.tsx`, `reset-password/page.tsx` |
| 4 | Chat sin límite de mensajes | Alto | Corregido (100) | `api/v1/chat/route.ts` |
| 5 | Referral code sin validación de formato | Alto | Corregido | `api/v1/referral/validate/route.ts` |
| 6 | Archivos validados solo por extensión | Alto | Corregido | `lib/ai/file-processing.ts` |

## Pendientes (requieren infraestructura adicional)

| # | Issue | Severidad | Notas |
|---|-------|-----------|-------|
| 1 | Rate limiting en endpoints | Alto | Requiere Redis/Upstash |
| 2 | Race conditions en referidos/créditos | Alto | Requiere transacciones DB o locks |
| 3 | CSP completo | Medio | Requiere auditar scripts inline y third-party |
| 4 | Audit logging para admins | Medio | Requiere tabla de audit logs |
| 5 | Pre-commit hook para secretos | Medio | Configurar `gitleaks` o similar |
| 6 | `npm audit fix` | Medio | Ejecutar y verificar compatibilidad |
| 7 | Restringir `ai_config` a admins | Bajo | Cambiar RLS policy en Supabase |

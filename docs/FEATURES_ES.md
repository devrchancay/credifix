# Credit Helper — Documentacion de Funcionalidades

**Producto:** Credit Helper por Florida Hitech Services INC
**Tipo:** Plataforma SaaS de Analisis de Credito con Inteligencia Artificial
**Version:** 1.0.0

---

## Tabla de Contenidos

1. [Stack Tecnologico](#stack-tecnologico)
2. [Funcionalidades para Usuarios](#funcionalidades-para-usuarios)
3. [Funcionalidades para Administradores](#funcionalidades-para-administradores)
4. [Seguridad e Infraestructura](#seguridad-e-infraestructura)
5. [Servicios Externos](#servicios-externos)
6. [Referencia de API](#referencia-de-api)
7. [Variables de Entorno](#variables-de-entorno)

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| Backend | Funciones serverless de Next.js (Vercel) |
| Base de Datos | Supabase (PostgreSQL + Row-Level Security) |
| Autenticacion | Supabase Auth (email/contrasena) |
| Motor de IA | OpenAI API (GPT-4o, GPT-4o-mini), AI SDK v6, Vector Store (RAG) |
| Pagos | Stripe (suscripciones, webhooks, portal de cliente) |
| Limitacion de Peticiones | Upstash Redis (ventana deslizante) |
| Internacionalizacion | next-intl (Ingles, Espanol) |
| Despliegue | Vercel |

---

## Funcionalidades para Usuarios

### 1. Autenticacion y Gestion de Cuenta

- **Registro / Inicio de sesion** con email y contrasena
- **Recuperacion de contrasena** mediante enlace por email
- **Gestion de perfil** — actualizar nombre e informacion personal
- **Configuracion de cuenta** — preferencias y cambio de contrasena
- **Gestion automatica de sesiones** — las sesiones se renuevan de forma transparente
- **Interfaz bilingue** — soporte completo en ingles y espanol

### 2. Chat de Analisis de Credito con IA (Funcionalidad Principal)

La funcionalidad central de Credit Helper: un asistente de chat con IA especializado en analisis de credito.

**Capacidades:**
- Respuestas en tiempo real con streaming
- Analisis e interpretacion de reportes de credito
- Recomendaciones personalizadas para mejorar el puntaje de credito
- Explicacion de factores de puntaje crediticio (historial de pagos, utilizacion, antiguedad, cuentas nuevas, mezcla de credito)
- Guia de estrategias de reparacion de credito
- Educacion sobre derechos del consumidor (FCRA, FDCPA)
- Respuestas bilingues — el asistente responde en el idioma del usuario

**Archivos Adjuntos:**
- Formatos soportados: PDF, DOCX, XLSX, CSV, TXT
- Hasta 5 archivos por mensaje, 10 MB cada uno
- Extraccion automatica de texto y analisis
- Validacion de tipo de archivo por bytes magicos

**Gestion de Conversaciones:**
- Historial completo de conversaciones con persistencia
- Busqueda en todas las conversaciones pasadas
- Crear, cambiar y eliminar conversaciones
- Generacion automatica de titulos

**Sistema Multi-Agente:**
- **Agente Basico** (plan gratuito) — GPT-4o-mini, orientacion crediticia general
- **Agente Premium** (planes de pago) — GPT-4o, analisis avanzado, redaccion de cartas de disputa, planes de accion personalizados
- Los agentes se habilitan automaticamente segun el plan de suscripcion del usuario

**Herramientas de IA:**
- **Busqueda web** — limitada a temas de credito en EE.UU. (burus de credito, FCRA, manejo de deudas, reparacion de credito)
- **Busqueda en base de conocimiento** — busca en documentos cargados por el administrador para respuestas precisas y con fuentes

### 3. Planes de Suscripcion y Facturacion

Tres niveles de suscripcion gestionados a traves de Stripe:

| Plan | Precio | Incluye |
|------|--------|---------|
| Gratuito | $0 | Agente basico, funciones comunitarias |
| Pro | $19/mes o $190/ano | Agentes premium, soporte prioritario, acceso API |
| Enterprise | $99/mes o $990/ano | Soporte personalizado, SLA, funciones avanzadas |

**Funciones de facturacion:**
- Stripe Checkout para pagos seguros
- Portal de cliente Stripe para autoservicio (actualizar metodo de pago, cancelar, ver facturas)
- Sincronizacion automatica de suscripciones via webhooks
- Soporte para upgrade y downgrade de planes
- Soporte para periodos de prueba

### 4. Sistema de Creditos

Un sistema de moneda virtual que recompensa la participacion del usuario:

- **Ganar creditos** a traves del programa de referidos
- **Canjear creditos** como descuentos en pagos de suscripcion
- Tasa por defecto: 1 credito = $0.25 (configurable por admin)
- Descuento maximo: 75% del precio de suscripcion (configurable)
- **Auto-canje** — aplicar creditos automaticamente en cada ciclo de facturacion
- Canje manual con vista previa del monto de descuento
- Historial completo de transacciones

### 5. Programa de Referidos

- Cada usuario recibe un codigo de referido unico
- Compartir por enlace — los usuarios referidos ven una pagina de invitacion personalizada
- **El referidor gana creditos** cuando el usuario referido se registra
- **El referido recibe creditos de bonificacion** al registrarse
- Panel de referidos mostrando:
  - Total de referidos, completados y pendientes
  - Balance de creditos (ganados, gastados, disponibles)
  - Historial de referidos con fechas y estados

### 6. Dashboard del Usuario

- Mensaje de bienvenida con el nombre del usuario
- Plan actual y estado de suscripcion
- Informacion de cuenta (ID, email)
- Indicador de estado activo/inactivo
- Aviso de upgrade para usuarios del plan gratuito

### 7. Pagina de Precios

- Comparacion publica de precios
- Toggle mensual/anual
- Comparacion de funciones entre planes
- Insignia de "Popular" destacada
- Integracion directa con checkout

---

## Funcionalidades para Administradores

### 1. Gestion de Usuarios

- Ver todos los usuarios registrados con busqueda y filtros
- Detalles de usuario: nombre, email, rol, fecha de registro
- Asignar roles (usuario / administrador)
- Lista de usuarios paginada

### 2. Gestion de Agentes de IA

- Crear, editar y eliminar agentes de IA
- Configuracion por agente:
  - Nombre, slug y descripcion
  - Asignacion de nivel (basico / premium)
  - Prompt del sistema (editor de texto completo)
  - Seleccion de modelo (GPT-4o, GPT-4o-mini, serie o)
  - Ajuste de Temperature, Top P y Max Tokens
  - Toggle activo/inactivo
- Asignar agentes a planes de suscripcion (controla que planes desbloquean que agentes)

### 3. Gestion de Base de Conocimiento

- Cargar documentos para construir la base de conocimiento de la IA (RAG)
- Formatos soportados: PDF, DOCX, XLSX, CSV, TXT, MD, JSON, HTML
- Base de conocimiento aislada por agente
- Seguimiento de estado de documentos (procesando / listo / fallido)
- Eliminar documentos de la base de conocimiento
- Impulsado por OpenAI Vector Store

### 4. Gestion de Planes

- Crear y editar planes de suscripcion
- Configurar por plan:
  - Nombre, slug, descripcion
  - IDs de precio de Stripe (mensual y anual)
  - Lista de funcionalidades
  - Limites de uso
  - Flag de popular y orden de visualizacion
  - Toggle activo/inactivo
  - Agentes de IA asignados
- Ver y vincular precios de Stripe

### 5. Configuracion de Creditos

- Establecer el valor del credito en centavos
- Establecer el porcentaje maximo de descuento
- Habilitar/deshabilitar el canje de creditos globalmente

### 6. Sincronizacion de Facturacion

- Sincronizacion manual de datos de suscripciones con Stripe
- Herramienta de recuperacion ante fallos en la entrega de webhooks

### 7. Registro de Auditoria

Todas las acciones administrativas se registran para cumplimiento:
- Cambios en agentes, planes y configuracion
- Modificaciones de roles de usuario
- Cargas a la base de conocimiento
- Sincronizaciones de facturacion
- Cada registro incluye: ID de usuario, tipo de accion, recurso, detalles, direccion IP y marca de tiempo

---

## Seguridad e Infraestructura

### Cabeceras de Seguridad
- Content-Security-Policy (CSP) con directivas estrictas
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS) con preload
- Referrer-Policy: strict-origin-when-cross-origin
- Restricciones de Permissions-Policy (camara, microfono, geolocalizacion)

### Autenticacion y Autorizacion
- Supabase Auth con cookies de sesion seguras
- Control de Acceso Basado en Roles (RBAC): roles de admin y usuario
- Row-Level Security (RLS) en todas las tablas de la base de datos
- Rutas protegidas con redireccion automatica
- Autenticacion via middleware en todos los endpoints de API

### Limitacion de Peticiones (Upstash Redis)
| Tipo de Endpoint | Limite |
|-----------------|--------|
| Autenticacion | 10 peticiones/min por IP |
| Chat | 30 peticiones/min por usuario |
| Carga de Archivos | 20 peticiones/min por usuario |
| Publico | 15 peticiones/min por IP |
| Facturacion | 10 peticiones/min por usuario |

Modo seguro: si Redis no esta disponible, las peticiones se permiten.

### Validacion de Entrada
- Validacion con esquemas Zod en todas las entradas de API
- Validacion de tamano y tipo de archivo con verificacion de bytes magicos
- Historial de mensajes limitado a 100 mensajes por peticion
- Validacion de URLs de redireccion seguras

### Seguridad Pre-commit
- Hook de pre-commit con Gitleaks para prevenir filtracion de secretos

---

## Servicios Externos

Los siguientes servicios externos son necesarios:

### 1. Supabase
- **Proposito:** Base de datos (PostgreSQL), autenticacion, almacenamiento de archivos
- **Requerido:** URL del proyecto, clave anonima, clave de rol de servicio
- **Configuracion:** Crear proyecto, ejecutar migraciones, configurar proveedores de autenticacion

### 2. Stripe
- **Proposito:** Facturacion de suscripciones, checkout, portal de cliente, webhooks
- **Requerido:** Clave secreta, clave publica, secreto de webhook, IDs de precios
- **Configuracion:** Crear productos/precios, configurar endpoint de webhook (`/api/webhooks/stripe`)
- **Eventos de webhook a registrar:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.created`
  - `invoice.payment_failed`

### 3. OpenAI
- **Proposito:** Modelos de chat con IA, vector store para base de conocimiento, busqueda web
- **Requerido:** Clave de API
- **Modelos utilizados:** GPT-4o, GPT-4o-mini (configurable por agente)

### 4. Upstash
- **Proposito:** Limitacion de peticiones basada en Redis
- **Requerido:** URL REST y token
- **Configuracion:** Crear una base de datos Redis en Upstash

### 5. Vercel
- **Proposito:** Hosting y despliegue
- **Configuracion:** Conectar repositorio de GitHub, configurar variables de entorno

---

## Referencia de API

### API Publica (`/api/v1/`)

Autenticacion: Token Bearer o cookie de sesion de Supabase.

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/api/v1/chat` | Respuesta de chat con IA en streaming |
| POST | `/api/v1/billing/checkout` | Crear sesion de checkout en Stripe |
| POST | `/api/v1/billing/portal` | Crear enlace al portal de cliente |
| GET | `/api/v1/billing/subscription` | Obtener suscripcion activa |
| GET | `/api/v1/credits/preview` | Vista previa de canje de creditos |
| POST | `/api/v1/credits/redeem` | Canjear creditos por descuento |
| GET | `/api/v1/credits/auto-redeem` | Obtener configuracion de auto-canje |
| PUT | `/api/v1/credits/auto-redeem` | Activar/desactivar auto-canje |
| GET | `/api/v1/referral/code` | Obtener codigo de referido del usuario |
| GET | `/api/v1/referral/stats` | Obtener estadisticas de referidos |
| GET | `/api/v1/referral/validate` | Validar un codigo de referido |
| POST | `/api/v1/referral/register` | Registrar referido en el registro |
| POST | `/api/v1/referral/track` | Rastrear visita de referido |
| POST | `/api/v1/files/process` | Procesar archivos cargados |
| POST | `/api/v1/transcribe` | Transcribir audio |
| GET | `/api/v1/plans` | Listar planes activos |
| GET | `/api/v1/agents` | Listar agentes disponibles |

### API de Administracion (`/api/admin/`)

Autenticacion: Rol de administrador requerido.

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET/POST | `/api/admin/agents` | Listar / crear agentes |
| GET/PUT/DELETE | `/api/admin/agents/[id]` | Obtener / actualizar / eliminar agente |
| POST | `/api/admin/agents/[id]/knowledge-base/init` | Inicializar base de conocimiento |
| GET/POST | `/api/admin/agents/[id]/knowledge-base` | Listar / cargar archivos |
| DELETE | `/api/admin/agents/[id]/knowledge-base/[fileId]` | Eliminar archivo |
| GET/POST | `/api/admin/plans` | Listar / crear planes |
| PATCH/DELETE | `/api/admin/plans/[id]` | Actualizar / eliminar plan |
| GET | `/api/admin/plans/stripe-prices` | Listar precios de Stripe |
| GET/PUT | `/api/admin/ai-config` | Obtener / actualizar config de IA |
| GET/PUT | `/api/admin/credit-config` | Obtener / actualizar config de creditos |
| GET | `/api/admin/users` | Listar usuarios |
| PATCH | `/api/admin/users/[id]/role` | Actualizar rol de usuario |
| POST | `/api/admin/billing/sync` | Sincronizar suscripciones de Stripe |

### Documentacion Interactiva de API

Swagger UI disponible en `/docs`.

---

## Variables de Entorno

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anonima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de rol de servicio de Supabase (solo servidor) |
| `OPENAI_API_KEY` | Clave de API de OpenAI |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Clave publica de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma de webhook de Stripe |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicacion |
| `UPSTASH_REDIS_REST_URL` | URL REST de Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de Upstash Redis |

---

## Resumen de Funcionalidades

| Funcionalidad | Disponible Para | Estado |
|--------------|----------------|--------|
| Autenticacion email/contrasena | Todos los usuarios | Activo |
| Recuperacion de contrasena | Todos los usuarios | Activo |
| Interfaz bilingue (EN/ES) | Todos los usuarios | Activo |
| Chat de analisis de credito con IA | Todos los usuarios | Activo |
| Archivos adjuntos en chat | Todos los usuarios | Activo |
| Historial y busqueda de conversaciones | Todos los usuarios | Activo |
| Agente de IA basico | Usuarios gratuitos | Activo |
| Agente de IA premium | Pro / Enterprise | Activo |
| Busqueda web en chat | Todos los usuarios | Activo |
| Base de conocimiento (RAG) | Todos los usuarios | Activo |
| Suscripciones con Stripe | Todos los usuarios | Activo |
| Portal de facturacion | Usuarios de pago | Activo |
| Sistema de creditos | Todos los usuarios | Activo |
| Auto-canje de creditos | Todos los usuarios | Activo |
| Programa de referidos | Todos los usuarios | Activo |
| Dashboard de usuario | Todos los usuarios | Activo |
| Admin: gestion de usuarios | Administradores | Activo |
| Admin: gestion de agentes | Administradores | Activo |
| Admin: base de conocimiento | Administradores | Activo |
| Admin: gestion de planes | Administradores | Activo |
| Admin: config de creditos | Administradores | Activo |
| Admin: registro de auditoria | Administradores | Activo |
| Limitacion de peticiones | Sistema | Activo |
| Cabeceras de seguridad (CSP, HSTS) | Sistema | Activo |
| Row-Level Security (RLS) | Sistema | Activo |
| Documentacion de API (Swagger) | Desarrolladores | Activo |

---

*Documento generado para Florida Hitech Services INC — Credit Helper v1.0.0*

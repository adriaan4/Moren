# Morén Peluquería de Caballeros — web + reservas + panel

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Upstash Redis · Zod. Sin Supabase ni Firebase.

## Puesta en marcha local

```bash
npm install
cp .env.example .env.local     # rellena las variables (ver abajo)
npm run dev                    # http://localhost:3000
```

Primer acceso al panel (`/admin`): define `INITIAL_ADMIN_USER` e `INITIAL_ADMIN_PASSWORD` (mín. 10 caracteres) y entra una vez en `/admin/login`.
Se crea el administrador en Redis con la contraseña cifrada (bcrypt). **Después borra `INITIAL_ADMIN_PASSWORD`** de las variables de entorno y cambia la contraseña en *Configuración*.

La web arranca **vacía a propósito**: sin servicios, precios ni horarios inventados. El propietario los define en el panel:
1. *Horarios de apertura* → horario semanal (y descanso de mediodía con dos franjas).
2. *Gestión de precios y servicios* → alta de servicios (solo nombre y precio son obligatorios).
3. *Configuración* → datos del negocio, fotos, opiniones reales, reglas de reserva y política de cancelación.

## Conectar Upstash Redis desde Vercel

1. En [vercel.com](https://vercel.com) → tu proyecto → pestaña **Storage** → **Create Database** → **Upstash** → *Redis*. Elige la región más cercana (p. ej. Frankfurt `eu-central-1`) y crea la base de datos.
2. En la base de datos pulsa **Connect Project** y selecciona el proyecto. Vercel añade automáticamente las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` (y `UPSTASH_REDIS_REST_*` según la versión de la integración). La app acepta ambos nombres.
3. (Alternativa manual) Crea la base en [console.upstash.com](https://console.upstash.com), copia *REST URL* y *REST Token* y añádelos en Vercel → **Settings → Environment Variables** como `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
4. Para desarrollo local: `vercel env pull .env.local`.

Las credenciales solo se leen en el servidor (`src/lib/redis.ts`); nunca llegan al navegador.

## Despliegue en Vercel

1. Sube el repositorio a GitHub y **Import Project** en Vercel (detecta Next.js solo).
2. Variables de entorno (Settings → Environment Variables), ver `.env.example`:
   `SITE_URL`, Upstash (paso anterior), `INITIAL_ADMIN_USER`, `INITIAL_ADMIN_PASSWORD`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` y, opcionalmente, `OWNER_NOTIFY_EMAIL` y `ERROR_WEBHOOK_URL`.
3. **Dominio personalizado**: Settings → Domains → añade tu dominio y configura el DNS que te indica Vercel. El certificado HTTPS (Let's Encrypt) se emite y renueva automáticamente. Actualiza `SITE_URL` con el dominio final.
4. **Correo (Resend)**: crea cuenta en resend.com, verifica tu dominio (registros DNS SPF/DKIM) y crea una API key. Usa un remitente del dominio verificado en `EMAIL_FROM`. Sin `RESEND_API_KEY` los correos solo se escriben en el log.
5. **Tareas programadas**: `vercel.json` define dos crons (se activan al desplegar):
   - `/api/cron/reminders` cada hora → envía el recordatorio a las citas que empiezan en las próximas 24 h (una sola vez por cita).
   - `/api/cron/backup` cada noche → copia de seguridad (se conservan las últimas 14).
   Define `CRON_SECRET` (cadena aleatoria larga): Vercel la envía como `Authorization: Bearer …` y las rutas rechazan cualquier otra petición. *Nota:* en el plan Hobby de Vercel los crons solo pueden ejecutarse **una vez al día**; para recordatorios horarios fiables se necesita plan Pro, o bien lanzar `/api/cron/reminders` cada hora desde un servicio externo (p. ej. cron-job.org o QStash de Upstash) con la cabecera `Authorization: Bearer <CRON_SECRET>`.
6. **Registro de errores y monitorización**: los errores 5xx se escriben en los *Runtime Logs* de Vercel y, si defines `ERROR_WEBHOOK_URL` (Slack/Discord), se envían allí. Activa también *Vercel Analytics / Speed Insights* y alertas de Upstash desde sus paneles.

## Arquitectura

```
src/
  app/            páginas y Route Handlers (api/)      (public)/ admin/ api/
  components/     public/ booking/ admin/ ui/
  services/       lógica de negocio (reservas, disponibilidad, auth, correos, copias…)
  repositories/   único lugar que habla con Redis
  schemas/        validación Zod de todas las peticiones
  types/ lib/     tipos, claves de Redis, utilidades, cliente fetch
tests/            unit · integration · e2e (Playwright)
```

**Disponibilidad y reservas sin duplicados.** Cada reserva bloquea tramos de 15 min con `SET key reservaId NX` (atómico en Redis). Si algún tramo ya pertenece a otra reserva, se liberan los adquiridos y se responde 409. Al modificar, se reserva el nuevo hueco *antes* de liberar el anterior; al cancelar se liberan. La disponibilidad se calcula siempre en el servidor (`services/availability.ts`) con la prioridad: vacaciones > excepción de fecha > horario semanal, menos bloqueos y tramos ocupados.

**Índices Redis** (`lib/keys.ts`): reservas por fecha, cliente y estado; conjunto ordenado global por fecha-hora; clientes por correo; servicios ordenados.

**Histórico de precios.** Cada reserva guarda una copia de nombre, precio y duración del servicio en el momento de reservar; editar la tarifa no altera reservas anteriores.

**Seguridad.** Contraseñas con bcrypt (coste 12); sesión con token aleatorio en cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción (en Redis solo se guarda su hash SHA-256); control de origen para peticiones que modifican datos (CSRF); bloqueo tras 5 intentos de login fallidos / 15 min; rate limiting por IP en endpoints públicos; permisos validados en servidor; cabeceras de seguridad y `noindex` en `/admin`; el calendario público nunca incluye datos personales; "Mis citas" por enlace seguro enviado al correo (sin contraseñas).

**RGPD.** Casilla de consentimiento obligatoria, política de privacidad/cookies y aviso legal (plantillas: **el titular debe completar NIF, razón social, etc. y revisarlas con su asesor**), solo cookies técnicas, y supresión de clientes anonimizando su historial.

**Copias de seguridad.** Cron nocturno + botón en *Configuración* (crear, descargar JSON, restaurar). Restaurar crea antes una copia del estado actual y reconstruye los bloqueos de horario.

**Notificaciones.** Interfaz `NotificationChannel` en `services/notificationService.ts`: el correo es el primer canal; SMS/WhatsApp se añaden implementando la interfaz, sin tocar el resto.

## Calidad

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm test              # Vitest: unitarias + integración (servicio de reservas sobre Redis simulado)
npm run test:e2e      # Playwright en 6 perfiles: Android, iPhone, tablets, portátil y pantalla grande
```

Los E2E necesitan el servidor en marcha y un Redis **de pruebas** (`E2E_ADMIN_USER`, `E2E_ADMIN_PASSWORD`).

## Pendiente de aportar por el propietario

Fotografías reales (portada, galería, servicios), logotipo oficial si existe (ahora es tipográfico en `components/public/Logo.tsx`), opiniones reales con permiso, datos legales (NIF/razón social) y dominio/remitente de correo.

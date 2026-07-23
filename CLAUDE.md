# Backend — Incubation System API

Express 5 + Mongoose 8 REST API with Socket.IO and a node-cron job. **CommonJS** (`require`/`module.exports`), plain JavaScript, no build step, no test suite.

```bash
npm run dev
```

`nodemon app.js`. Serves on `PORT` from `.env.development` (set to `5000` — both frontends assume this). `npm start` runs it without nodemon.

## Layout

```
app.js            entry: env load → db connect → cron init → socket init → CORS → routes → error mw
routes/           thin; index.route.js mounts everything under /api/*
controllers/      all business logic lives here
models/           mongoose schemas, lowercase model names ("user", "team", "PM")
middlewares/      auth (protect/optionalProtect), error, zod validator, objectId check
validators/       zod schemas consumed by form-validator.middleware
config/           db.config.js, multer.config.js (Cloudinary storage)
services/         sendEmail.js (nodemailer)
jobs/             attendance.job.js — cron
socket/           index.js — Socket.IO server + JWT handshake auth
utils/            token, email, paginate, deviceDetector
```

## Conventions that matter

- **Env loading is conditional.** `app.js` loads `.env.development` when `NODE_ENV !== "production"`, otherwise `.env`. Anything reading `process.env` at module top-level must be required *after* that block in `app.js`, or it sees `undefined`. `config/multer.config.js` already guards against missing Cloudinary vars this way.
- **Route mounting is split across two places.** Most routes come through `routes/index.route.js` (mounted at `/`), but `comments`, `likes`, `notifications`, and `push` are *also* mounted directly in `app.js`. Check both before adding a path — `/api/comments` and `/api/push` are currently registered twice. One further nesting: `task.route.js` is mounted *inside* `admin.route.js` as `/task`, so its real prefix is `/api/admin/task`.
- **Most `/api/admin/*` routes have no auth middleware.** `admin.route.js` mounts posts, PMs, teams, and projects without `protect`. That's pre-existing, not a pattern to copy — `task.route.js` applies `router.use(protect)` to everything, matching attendance/calendar/comment routes.
- **Controllers export in two different styles.** Some are bare functions (`exports.createPost = ...`), some are classes/objects (`TeamController`, `ProjectController`). Match whatever the file you're editing already does.
- **Validation** is zod via `validate(SomeSchema)` from `middlewares/form-validator.middleware`. Add new schemas under `validators/`, not inline in the route.
- **Auth** — `protect` requires a valid JWT (Bearer header or `token` cookie) and sets `req.user`; `optionalProtect` populates `req.user` when a token is present and silently continues when it isn't. Error strings are load-bearing: the frontends' axios interceptors trigger a token refresh only on the exact messages `"jwt expired"`, `"Invalid token"`, `"No token"`. Don't reword them.
- **Soft deletes** — most models carry `deletedAt: { default: null }`. Filter on it in new queries rather than hard-deleting.
- Three separate identity models: `user` (students), `admin` (username/password only), `PM` (project managers).

## Attendance subsystem

The most intricate part of the codebase.

- `models/attendance-settings.model.js` is a **singleton** — read it via `AttendanceSettings.getSettings()`, never `findOne` directly. It holds per-shift (`Morning`/`Evening`) start/end hours, late and early-leave thresholds, `minHoursForPresent`, `workingDays`, plus global `timezone` (`Asia/Karachi`), `allowedIPs`, and `allowEarlyCheckIn`.
- All date math uses `moment-timezone` against `settings.timezone`. Never use bare `new Date()` for attendance logic — the server runs UTC and the business day is Karachi.
- Check-in is **IP-restricted** (`IP_ADDRESS_ONE`/`IP_ADDRESS_TWO` env vars plus `settings.allowedIPs`); the student UI surfaces the caller's public IP when a check-in is rejected.
- `jobs/attendance.job.js` marks absentees for *yesterday* and guards against double-runs with an atomic `findOneAndUpdate` on `lastAutomatedRunDate` (`YYYY-MM-DD`). Preserve that lock if you touch the job — it's the only thing preventing duplicate absence records.
- A user's `workingDays` overrides the shift default when non-null; `null` means "use the shift".

## Task board

Kanban tasks for a project. `models/task.model.js` exports the model with `Task.STATUSES` (`Backlog`, `In Progress`, `Review`, `Done`) and `Task.PRIORITIES` attached — import those rather than re-typing the strings.

- `GET /api/admin/task/board/:projectId` returns `{ project, columns }` already grouped per status, so clients don't group it themselves.
- `PATCH /api/admin/task/:id/move` is the only thing that writes `order`. The **client sends the destination column's full ordered id list** after a drop and the server writes index → `order` via `bulkWrite`. No server-side index arithmetic, and the operation is idempotent. It verifies every id belongs to the moved task's project first, so one project's payload can't renumber another's.
- `order` is a sort key only, so the gap left in the source column when a card leaves is deliberate — nothing compacts it.
- Soft delete via `deletedAt`, like every other model.

Every mutation calls `emitToProject(projectId, event, payload)` → `task:created` / `task:updated` / `task:moved` / `task:deleted`, broadcast to the `project:<id>` socket room.

## Job logging

Cron runs are recorded in the **same `Log` collection** the error middleware writes to — no separate alerting service. `models/log.model.js` has a 30-day TTL on `timestamp` and a `level` enum of `error`/`warn`/`info`.

`jobs/attendance.job.js` has a local `writeJobLog` helper that stamps `route: "cron:attendance"` and `method: "CRON"`, so job entries can be filtered apart from HTTP error logs. It writes an `info` entry with the run's counts on success and an `error` entry with the stack on failure. Two properties to preserve:

- **Dry runs are not logged**, so test invocations don't pollute the collection.
- **`writeJobLog` never throws.** A failed log write must not take down the job it is reporting on — same reasoning as the fire-and-forget `Log.create` in `error.middleware.js`.

There is no admin-facing UI over `Log` yet; read it straight from Mongo.

## Sockets

`socket/index.js` authenticates the handshake with `JWT_SECRET` and puts `socket.userId` / `socket.userRole` on the connection. Its CORS allowlist is a **copy** of the one in `app.js` — update both together.

Rooms: `<userId>` (personal, for DMs and notifications), `post:<id>`, and `project:<id>` (task board). Helpers exported alongside `getIO`: `emitNotification(userId, payload)` and `emitToProject(projectId, event, payload)`; both no-op safely before the server is initialized.

## Env vars

`MONGO_URL`, `JWT_SECRET`, `PORT`, `LOCAL_URL`, `ADMIN_URL`, `USER_URL`, `BACKEND_URL`, `CLOUDINARY_CLOUD_NAME/_API_KEY/_API_SECRET`, `SMTP_HOST/_PORT/_USER/_PASS`, `IP_ADDRESS_ONE`, `IP_ADDRESS_TWO`. `.env*` is gitignored here — keep it that way.

## Deployment

Push to `main` → `.github/workflows/deploy.yml` SCPs the repo to `/var/www/banoqabil-ims/api` on the VPS and runs `npm install --omit=dev` + `pm2 reload api`. `vercel.json` is a leftover from an older deploy target.

The `output*.log`, `debug_notif.js`, and `verify_api.js` files at the root are ad-hoc debugging artifacts, not part of the app.

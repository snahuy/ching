# Internet multiplayer for Ching: Vercel + Render Free + Neon Free

The frontend stays at https://ching-nine.vercel.app. Friends anywhere connect to the same public WebSocket backend using room codes or Vercel invite links/QR codes. They do not need player accounts. **The code is ready to configure, but this hosted setup is not live or verified until the account setup below is completed.**

## What was wrong

React/TypeScript/Vite used a development-only `/socket` proxy. The live Vercel `/socket` WebSocket handshake returned 404 NOT_FOUND on October 13, 2026. The original Node `ws` backend also kept rooms only in memory. Static frontend deployment alone cannot run this server.

The server now commits authoritative rooms, tokens, hidden moves, deadlines, history, scores and results into remote PostgreSQL before delivering gameplay acknowledgements. The existing rules, bots, eight-player rooms, avatars, targets, reactions and rematches are retained. Database ownership fencing prevents overlapping deployments from writing two conflicting authoritative states. Commands and timer transitions run serially while database writes are pending. Failed writes close sockets and return unhealthy status rather than acknowledging unsaved results.

## 1. Create the database — Neon Free

1. Sign up at https://console.neon.tech and create a project on the **Free** plan. Choose the nearest offered region to Render Singapore.
2. Create a database named `ching` (or use the default `neondb`). Use a dedicated project for this game.
3. In **Connect**, select the database/role and copy its PostgreSQL connection string. Either direct or pooled TCP connection works; there are no session-level advisory locks. Keep TLS enabled. Prefer `sslmode=verify-full`; preserve any `channel_binding=require` parameter supplied by Neon.
4. Put that string **only** in the Render `DATABASE_URL` secret below. Do not paste it into chat, source code, Vercel public variables, or any `VITE_*` value.

The application automatically performs the idempotent v1 migration at startup:

```sql
CREATE TABLE IF NOT EXISTS ching_room_state (
  id TEXT PRIMARY KEY CHECK (id = 'main'),
  version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  owner TEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0
);
```

No browser gets a database role or direct SQL access. The backend role needs CREATE TABLE and SELECT/INSERT/UPDATE permission on this dedicated database. No public database API or client access policy is enabled. The one private state row contains guest bearer tokens and unrevealed moves; keep its credentials and backups private.

## 2. Create the public server — Render Free

Publish these repository changes to GitHub, then:

1. Sign up at https://dashboard.render.com.
2. Choose **New → Blueprint**, connect `snahuy/ching`, and use the repository's `render.yaml`.
3. Confirm **Free** instance plan, Singapore region, one instance, and **no persistent disk**. The previous paid disk requirement has been removed.
4. When prompted for `DATABASE_URL`, paste the Neon connection string from step 1. The blueprint declares this as a secret that you must supply, without a committed value.
5. Confirm the remaining variables/settings:
   - `NODE_ENV=production`
   - `NODE_VERSION=24.15.0`
   - `ALLOWED_ORIGINS=https://ching-nine.vercel.app`
   - Build: `npm ci --include=dev && npm run build`
   - Start: `npm start`
   - Health path: `/health`
   - `PORT` is supplied automatically by Render.
6. After deployment, open `https://YOUR-ASSIGNED-HOST.onrender.com/health`. Expect HTTP 200 with `{"ok":true}`. Use the actual assigned hostname.

If your dashboard does not offer Blueprint creation on your account, create **New → Web Service** from the same GitHub repo and enter those exact settings manually. Choose Free, not Static Site. Do not set `ROOM_DB_PATH` for this free service: Render's local disk is ephemeral.

For a custom frontend domain, add its exact origin to `ALLOWED_ORIGINS`, comma-separated and without trailing slashes. Preview origins are not automatically trusted; add specific ones if testing them. Keep one service/instance attached to this database. A newer process atomically takes ownership of the state row; stale writers fail closed. Do not deploy multiple active services or enable horizontal replicas against the same state row. This is a small-group backend, not a horizontally scaled service.

## 3. Connect and redeploy Vercel

Version 1.0.6 bundles the public default `wss://ching-multiplayer.onrender.com/socket`. This is not a secret. A missing or blank Vercel variable uses that default; local development still uses the local proxy. For a different backend, override it as follows:

1. In your existing Vercel project, add this **Production** environment variable:
   `VITE_MULTIPLAYER_URL=wss://YOUR-ASSIGNED-HOST.onrender.com/socket`
2. Keep build `npm run build`, output `dist`, and the existing Vite project settings.
3. Redeploy after setting the variable. Vite embeds it at build time; changing the variable without rebuilding does not change the deployed site.
4. The database secret belongs only on Render. The WebSocket URL is public, so the `VITE_` prefix is appropriate for that URL.
5. Open https://ching-nine.vercel.app, create a room, and send the invite link to a friend using a different browser/device/network. Both connect to the same backend. QR codes contain the same frontend invite URL.

## Free hosting limits

Render Free sleeps after 15 minutes without inbound HTTP/WebSocket traffic and may take about a minute to wake. The frontend reconnects automatically; give it time rather than repeatedly creating rooms. Render documents free hosting as suitable for hobby/testing use, not guaranteed production availability. It has monthly usage limits and may suspend services for unusually high outbound traffic, including database traffic. Neon Free also has storage/compute quotas. Stay on Free plans and monitor the dashboards; avoid adding paid upgrades unless you intend them. This setup requires no paid persistent disk, but it does not promise unlimited free hosting.

Official sources reviewed October 13, 2026:

- https://render.com/docs/free
- https://render.com/docs/websocket
- https://render.com/docs/blueprint-spec
- https://neon.com/blog/neon-free-plan-1-gb-per-project
- https://node-postgres.com/features/transactions
- https://vercel.com/docs/functions/websockets

## Recovery and privacy

Guests retain a stable room token/player ID in localStorage, migrating the older sessionStorage token. Refresh resumes the same member. Opening that identity in another tab takes over the old socket without deleting the active token. Clearing browser storage loses that guest identity. Unmounting cleans up subscriptions.

Human disconnects retain a place for 20 seconds, transfer host responsibilities, and forfeit at a round boundary after the grace period. A restarted process restores private locks and the shared round deadline; it does not replay a scored result. Missing moves default to Block 1 on the server's deadline. Late joiners spectate the existing match and join the next lobby. Empty inactive rooms close after five minutes, connected inactive rooms after 30 minutes. Long cold starts/outages can exceed the reconnect grace period; an interrupted match may end through forfeits. Room storage remains durable on Neon even when Render's filesystem is discarded.

All human moves are validated on the backend against round ID, ammo, target and phase. Public views omit other players' locked moves and targets until reveal. Clients cannot set ammo, scores or winners. Only a player's own locked action is returned to them. Atomic revision/owner checks reject stale writers, including overlapping deploys; commits are completed before state/messages are delivered.

## Verification

Run `npm test` and `npm run build`. Existing tests cover real WebSockets, eight players, hidden moves, invalid/duplicate/stale submissions, timers, scoring, bots, disconnects, restart recovery and rematch. The added async-storage test uses a real local SQLite file with delayed commits to prove acknowledgements are withheld until durable writes complete and queued simultaneous commands resolve correctly. It is not a hosted Postgres test.

To run the opt-in real PostgreSQL storage test, set `CHING_TEST_DATABASE_URL` to a **disposable test database**, then run `npm test -- server/postgres.test.ts`. This test claims the state row and must never point at your active game database. It checks persisted recovery and rejection of a superseded writer. Without that variable, the test is explicitly skipped; no hosted database connection is fabricated.

Prior local browser checks with two independent sessions passed create/invite join, settings, readiness/start, simultaneous moves, refresh, secret submissions, identical results, rematch, English/Khmer mobile rendering and single-player start. Local screenshots/scripts are under ignored `.verification/multiplayer/`. The remote PostgreSQL integration and internet deployment still require your accounts/connection configuration and subsequent testing.

The free-hosting changes passed 430 tests with one real-PostgreSQL test explicitly skipped because no test database credentials were available. The production build passed. Dependencies were installed with zero reported npm audit vulnerabilities at installation. These results do not establish hosted PostgreSQL connectivity or successful internet deployment.

After configuring the services, verify on two devices on different networks: create/join by room code and invite/QR, change avatar/settings, ready/start, simultaneous actions, timeout, final scores, rematch, refresh and brief disconnection. Check invalid/full/expired codes, both languages and mobile layout. Only after those checks should the hosted multiplayer be described as verified.

## Local development and optional paid alternative

`npm run dev` still starts the local Node backend and Vite proxy. `.env.example` lists all variables with placeholders. For a persistent local SQLite server, set `ROOM_DB_PATH=.verification/rooms.sqlite` in the server process and omit `DATABASE_URL`. For a hosted SQLite alternative, a paid persistent disk is required; this is optional and no longer the default blueprint. Existing SQLite files are not automatically imported into PostgreSQL; a fresh hosted database starts with fresh rooms while unrelated browser preferences and single-player progress remain unchanged.

import { createGameServer } from './http.ts';
const app = createGameServer();
const port = Number(process.env.PORT ?? 3001);
app.server.listen(port, '0.0.0.0', () => console.log(`Ching multiplayer listening on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void app.close().then(() => process.exit(0)); });

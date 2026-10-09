import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: '0.0.0.0', port: 5173, proxy: { '/socket': { target: 'ws://127.0.0.1:3001', ws: true } } },
});

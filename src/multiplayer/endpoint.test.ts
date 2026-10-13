import { expect, it } from 'vitest';
import { multiplayerEndpoint } from './endpoint';
const page = { protocol: 'https:', host: 'ching-nine.vercel.app' };
it('uses the hosted backend instead of the static Vercel origin', () => {
  expect(multiplayerEndpoint('wss://example.onrender.com/socket', page, false)).toBe('wss://example.onrender.com/socket');
  expect(() => multiplayerEndpoint(undefined, page, false)).toThrow('not configured');
  expect(() => multiplayerEndpoint('ws://localhost:3001/socket', page, false)).toThrow('secure');
  expect(() => multiplayerEndpoint('wss://secret:password@example.com/socket', page, false)).toThrow('invalid');
  expect(multiplayerEndpoint(undefined, { protocol: 'http:', host: 'localhost:5173' }, true)).toBe('ws://localhost:5173/socket');
});

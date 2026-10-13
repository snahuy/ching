import { expect, it } from 'vitest';
import { multiplayerEndpoint } from './endpoint';
import { DEFAULT_MULTIPLAYER_URL } from './deployment';
const page = { protocol: 'https:', host: 'ching-nine.vercel.app' };
it('uses the confirmed public production default when the deployed variable is missing or blank', () => {
  expect(multiplayerEndpoint(undefined, page, false, DEFAULT_MULTIPLAYER_URL)).toBe('wss://ching-multiplayer.onrender.com/socket');
  expect(multiplayerEndpoint('  ', page, false, DEFAULT_MULTIPLAYER_URL)).toBe(DEFAULT_MULTIPLAYER_URL);
  expect(multiplayerEndpoint('wss://alternate.example/socket', page, false, DEFAULT_MULTIPLAYER_URL)).toBe('wss://alternate.example/socket');
  expect(multiplayerEndpoint(undefined, { protocol: 'http:', host: 'localhost:5173' }, true, DEFAULT_MULTIPLAYER_URL)).toBe('ws://localhost:5173/socket');
});
it('uses the hosted backend instead of the static Vercel origin', () => {
  expect(multiplayerEndpoint('wss://example.onrender.com/socket', page, false)).toBe('wss://example.onrender.com/socket');
  expect(() => multiplayerEndpoint(undefined, page, false)).toThrow('not configured');
  expect(() => multiplayerEndpoint('ws://localhost:3001/socket', page, false)).toThrow('secure');
  expect(() => multiplayerEndpoint('wss://secret:password@example.com/socket', page, false)).toThrow('invalid');
  expect(multiplayerEndpoint(undefined, { protocol: 'http:', host: 'localhost:5173' }, true)).toBe('ws://localhost:5173/socket');
});

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, PublicRoom, RoomSession, ServerMessage } from './protocol';
import { multiplayerEndpoint } from './endpoint';
const SESSION_KEY = 'ching.room.session.v1';
function storedSession(): RoomSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY) ?? 'null');
    const requested = new URLSearchParams(location.search).get('room')?.toUpperCase();
    return value && typeof value.code === 'string' && typeof value.playerId === 'string' && typeof value.token === 'string' && (!requested || requested === value.code) ? value : null;
  } catch { return null; }
}
export function useRoom() {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [error, setError] = useState('');
  const [serverOffset, setServerOffset] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const session = useRef<RoomSession | null>(storedSession());
  const clearSession = useCallback(() => { session.current = null; try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* In-memory reconnect still works. */ } }, []);
  useEffect(() => {
    let disposed = false, retry: ReturnType<typeof setTimeout> | undefined, attempts = 0, takenOver = false;
    let endpoint: string;
    try { endpoint = multiplayerEndpoint(import.meta.env.VITE_MULTIPLAYER_URL, location, import.meta.env.DEV); }
    catch (cause) { setConnection('disconnected'); setError((cause as Error).message); return; }
    function connect() {
      if (disposed) return;
      const ws = new WebSocket(endpoint);
      socket.current = ws;
      ws.onopen = () => {
        if (disposed || socket.current !== ws) return;
        attempts = 0; if (!takenOver) setError('');
        setConnection(session.current ? 'reconnecting' : 'connected');
        if (session.current) ws.send(JSON.stringify({ type: 'resume', code: session.current.code, token: session.current.token }));
      };
      ws.onmessage = event => {
        if (disposed || socket.current !== ws) return;
        let message: ServerMessage;
        try { message = JSON.parse(event.data) as ServerMessage; }
        catch { setError('The room server sent an invalid response.'); ws.close(); return; }
        if (message.type === 'session') {
          setConnection('connected');
          session.current = message.session;
          const url = new URL(location.href); url.searchParams.set('room', message.session.code); history.replaceState(null, '', url);
          try { localStorage.setItem(SESSION_KEY, JSON.stringify(message.session)); sessionStorage.removeItem(SESSION_KEY); } catch { /* Memory-only guests may still play. */ }
          setError('');
        } else if (message.type === 'state') { setRoom(message.room); setServerOffset(Date.now() - message.room.serverNow); }
        else if (message.type === 'error') {
          setError(message.message);
          if (message.fatal) { clearSession(); setRoom(null); setConnection('connected'); }
        } else if (message.type === 'left') { clearSession(); setRoom(null); }
      };
      ws.onclose = event => {
        if (disposed || socket.current !== ws) return;
        if (event.code === 4001) {
          // Keep the shared token for the tab that took over, but do not fight it.
          takenOver = true; session.current = null; setRoom(null);
          setError('This room session was opened in another tab. Join again to play here.');
        }
        setConnection(navigator.onLine ? 'reconnecting' : 'disconnected');
        if (event.code !== 4001) setError('Cannot reach the room server. Reconnecting automatically…');
        retry = setTimeout(connect, Math.min(5000, 500 * 2 ** attempts++));
      };
      ws.onerror = () => { if (!disposed && socket.current === ws) setConnection('reconnecting'); };
    }
    const online = () => { clearTimeout(retry); socket.current?.close(); connect(); };
    window.addEventListener('online', online);
    connect();
    return () => { disposed = true; window.removeEventListener('online', online); clearTimeout(retry); socket.current?.close(); };
  }, [clearSession]);
  const send = useCallback((message: ClientMessage): boolean => {
    if (socket.current?.readyState !== WebSocket.OPEN) { setError('Reconnecting. Please wait before submitting.'); return false; }
    setError(''); socket.current.send(JSON.stringify(message)); return true;
  }, []);
  const leave = useCallback(() => {
    send({ type: 'leave' }); clearSession(); setRoom(null); socket.current?.close();
  }, [send, clearSession]);
  return { room, connection, error, serverOffset, send, leave, clearError: () => setError('') };
}

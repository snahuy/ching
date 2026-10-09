import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, PublicRoom, RoomSession, ServerMessage } from './protocol';
const SESSION_KEY = 'ching.room.session.v1';
function storedSession(): RoomSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
    const requested = new URLSearchParams(location.search).get('room')?.toUpperCase();
    return value && typeof value.code === 'string' && typeof value.playerId === 'string' && typeof value.token === 'string' && (!requested || requested === value.code) ? value : null;
  } catch { return null; }
}
export function useRoom() {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [error, setError] = useState('');
  const [serverOffset, setServerOffset] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const session = useRef<RoomSession | null>(storedSession());
  const clearSession = useCallback(() => { session.current = null; try { sessionStorage.removeItem(SESSION_KEY); } catch { /* In-memory reconnect still works. */ } }, []);
  useEffect(() => {
    let disposed = false, retry: ReturnType<typeof setTimeout> | undefined;
    function connect() {
      if (disposed) return;
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/socket`);
      socket.current = ws;
      ws.onopen = () => {
        if (disposed) return;
        setConnection(session.current ? 'reconnecting' : 'connected');
        if (session.current) ws.send(JSON.stringify({ type: 'resume', code: session.current.code, token: session.current.token }));
      };
      ws.onmessage = event => {
        if (disposed) return;
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === 'session') {
          setConnection('connected');
          session.current = message.session;
          const url = new URL(location.href); url.searchParams.set('room', message.session.code); history.replaceState(null, '', url);
          try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(message.session)); } catch { /* Memory-only guests may still play. */ }
          setError('');
        } else if (message.type === 'state') { setRoom(message.room); setServerOffset(Date.now() - message.room.serverNow); }
        else if (message.type === 'error') {
          setError(message.message);
          if (message.fatal) { clearSession(); setRoom(null); setConnection('connected'); }
        } else if (message.type === 'left') { clearSession(); setRoom(null); }
      };
      ws.onclose = event => {
        if (disposed) return;
        if (event.code === 4001) { clearSession(); setRoom(null); setError('This room session was opened in another tab. Join again to play here.'); }
        setConnection('reconnecting'); retry = setTimeout(connect, 1000);
      };
      ws.onerror = () => { if (!disposed) setConnection('reconnecting'); };
    }
    connect();
    return () => { disposed = true; clearTimeout(retry); socket.current?.close(); };
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

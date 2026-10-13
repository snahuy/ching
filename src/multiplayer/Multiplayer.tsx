import { revealedMoveLabel, battleAnnouncement, gameAnnouncement } from '../roundPresentation';
import { ActivityBar, ActivityFeed, ReactionBubble, useReactionMute } from '../ActivityUI';
import { useLanguage } from '../i18n/react';
import { attackMessage } from '../i18n/core';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { CharacterSelect } from '../CharacterSelect';
import { BattleShell, BattleMenu, BattleSheet, MovePanel } from '../BattleUI';
import { MatchOptions } from '../MatchOptions';
import type { Difficulty } from '../ai';
import QRCode from 'qrcode';
import { Avatar } from '../Avatar';
import { Character } from '../Character';
import { Gesture } from '../Gesture';
import { type AvatarProfile } from '../avatars';
import { MOVES, type MoveId } from '../rules';
import type { CharacterState } from '../characterState';
import { useRoom } from './useRoom';
import type { ClientMessage, PublicRoom, RoomPlayer, RoundHistory } from './protocol';
import './multiplayer.css';

function stateFor(player: RoomPlayer, room: PublicRoom): CharacterState {
  if (!player.participating) return 'idle';
  const latest = room.history.at(-1);
  const current = latest?.round === room.round ? latest : undefined;
  const action = current?.actions.find(a => a.playerId === player.id);
  if (room.phase === 'finished' || room.phase === 'intermission') return (room.phase === 'finished' ? room.championId : room.winnerId) === player.id ? 'victory' : player.active ? 'idle' : 'defeat';
  if (room.phase === 'reveal' && action) return action.move;
  if (room.phase === 'reaction' && current?.eliminated.includes(player.id)) return 'hit';
  if (!player.active) return 'defeat';
  if (room.phase === 'countdown') return 'clap';
  if (room.phase === 'reaction') {
    if (action && MOVES[action.move].kind === 'block' && current?.events.some(e => e.targetId === player.id && e.result === 'blocked')) return 'blocked';
    if (action?.move === 'reload') return 'reload';
  }
  return 'idle';
}

function Invite({ code }: { code: string }) {
  const { t, language, move: moveLabel } = useLanguage();
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState('');
  const link = `${location.origin}${import.meta.env.BASE_URL}?room=${code}`;
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { let active = true; void QRCode.toDataURL(link, { width: 220, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#302e46', light: '#ffffff' } }).then(url => { if (active) setQr(url); }); return () => { active = false; }; }, [link]);
  async function copy() {
    try { if (!navigator.clipboard) throw new Error(); await navigator.clipboard.writeText(link); setCopied('Invite link copied.'); }
    catch { field.current?.focus(); field.current?.select(); setCopied('Link selected. Copy it to invite your friends.'); }
  }
  return <section className="room-invite"><div><div className="eyebrow">{t("YOUR PRIVATE SCHOOLYARD")}</div><h2>{code}</h2><p>{t("Invite up to 7 friends. No account needed.")}</p><label>{t("Invite link")}<input ref={field} value={link} readOnly onFocus={e => e.target.select()}/></label><button className="room-secondary" onClick={() => void copy()}>{t("Copy invite link")}<span aria-hidden="true">↗</span></button><p className="room-copy-status" role="status">{t(copied)}</p>{['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && <p className="invite-network-note">{t("For another device, open Ching using your computer’s LAN address first. Internet invites need a publicly hosted server.")}</p>}</div><div className="room-qr">{qr && <img src={qr} width="148" height="148" alt={t('Scan to join private Ching room {code}', { code })}/>}<span>{t("SCAN TO JOIN")}</span></div></section>;
}

function AttackLines({ room, elements }: { room: PublicRoom; elements: React.RefObject<Map<string, HTMLElement>> }) {
  const { t, language, move: moveLabel } = useLanguage();
  const [geometry, setGeometry] = useState<{ width: number; height: number; paths: { key: string; d: string; label: string; result: string }[] } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const marker = useId().replace(/:/g, '');
  const last = room.history.at(-1);
  useEffect(() => {
    function measure() {
      const parent = svg.current?.parentElement;
      if (!parent) return;
      const bounds = parent.getBoundingClientRect();
      const paths = (last?.events ?? []).flatMap(event => {
        const attacker = elements.current.get(event.attackerId)?.getBoundingClientRect(), target = elements.current.get(event.targetId)?.getBoundingClientRect();
        if (!attacker || !target) return [];
        const x = attacker.x - bounds.x + attacker.width / 2, y = attacker.y - bounds.y + attacker.height * 0.52;
        const tx = target.x - bounds.x + target.width / 2, ty = target.y - bounds.y + target.height * 0.52;
        return [{ key: event.attackerId, d: `M ${x} ${y} Q ${(x + tx) / 2 + 18} ${(y + ty) / 2 - 34} ${tx} ${ty}`, result: event.result, label: attackMessage(language, event, id => room.players.find(p => p.id === id)?.nickname ?? t('PLAYER')) }];
      });
      setGeometry({ width: bounds.width, height: bounds.height, paths });
    }
    measure(); const observer = new ResizeObserver(measure); if (svg.current?.parentElement) observer.observe(svg.current.parentElement);
    return () => observer.disconnect();
  }, [last, elements, room.players, language]);
  return <svg ref={svg} className="attack-lines" viewBox={geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined} aria-label={t("Revealed attack targets")} role="img"><defs><marker id={`arrow-${marker}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="#8062cc"/></marker></defs>{geometry?.paths.map(p => <g key={p.key}><title>{p.label}</title><path className={`attack-trail trail-${p.result}`} d={p.d} pathLength="1" fill="none" strokeWidth="3.5" markerEnd={`url(#arrow-${marker})`}/></g>)}</svg>;
}

function History({ room }: { room: PublicRoom }) {
  const { t, language, move: moveLabel } = useLanguage();
  const name = (id: string) => room.players.find(p => p.id === id)?.nickname ?? t('PLAYER');
  return <section className="room-history"><h2>{t("Move-round history")}</h2>{room.history.length === 0 ? <p>{t("The schoolyard is quiet. Reload to get started.")}</p> : room.history.slice(-10).reverse().map((round, index) => <details key={`${round.game}-${round.round}-${round.kind}`} open={index === 0}><summary>{t('Game {game} · Move round {round}', { game: round.game, round: round.round })}<span>{round.eliminated.length ? t('{count} eliminated', { count: round.eliminated.length }) : t("Everyone survives")}</span></summary><ul>{round.actions.map(action => <li key={action.playerId}><strong>{name(action.playerId)}</strong> {moveLabel(action.move)}{action.targetId && <> → <strong>{name(action.targetId)}</strong></>}{MOVES[action.move].kind === 'block' && <span className="history-detail"> {t("covers")}{MOVES[action.move].stops.map(m => moveLabel(m)).join(' / ')}</span>}</li>)}{round.events.map(event => <li key={event.attackerId} className={`event-${event.result}`}>{attackMessage(language, event, name)}</li>)}{round.eliminated.length > 0 && <li className="history-eliminations">{t("Eliminated:")}{round.eliminated.map(name).join(', ')}</li>}{round.forfeits.length > 0 && <li>{t("Connection window expired / left:")}{round.forfeits.map(name).join(', ')}</li>}</ul></details>)}</section>;
}

function RoomBattle({ room, connected, error, serverOffset, now, reduced, muted, onMute, onHelp, onSettings, exit, draft, target, setDraft, setTarget, locked, canChoose, canLock, submit, send, delay, elements }: {
  room: PublicRoom; connected: boolean; error: string; serverOffset: number; now: number; reduced: boolean; muted: boolean; onMute: () => void; onHelp: () => void; onSettings: () => void; exit: () => void;
  draft: MoveId; target: string | null; setDraft: (move: MoveId) => void; setTarget: (id: string) => void; locked: boolean; canChoose: boolean; canLock: boolean; submit: () => void;
  send: (message: ClientMessage) => boolean; delay: number; elements: React.RefObject<Map<string, HTMLElement>>;
}) {
  const { t, language, move: moveLabel } = useLanguage();
  const [sheet, setSheet] = useState<'history' | 'standings' | null>(null);
  const reactions = useReactionMute();
  const [focusId, setFocusId] = useState<string | null>(null);
  const me = room.players.find(p => p.id === room.selfId)!;
  const others = room.players.filter(p => p.id !== room.selfId);
  const opponent = others.find(p => p.id === focusId) ?? others.find(p => p.id === target) ?? others.find(p => p.active) ?? others[0];
  const shown = ['reveal', 'reaction', 'intermission', 'finished'].includes(room.phase);
  const latest = shown ? room.history.at(-1) : undefined;
  const leader = [...room.players].sort((a, b) => b.score - a.score)[0];
  const needsTarget = MOVES[draft].kind === 'attack';
  const name = (id: string) => room.players.find(p => p.id === id)?.nickname ?? t('PLAYER');
  const isHost = room.hostId === room.selfId;
  const active = Boolean(me.active && me.participating && !me.forfeitPending);
  const roundAnnouncement = shown && latest ? battleAnnouncement(language, latest, room.players.filter(p=>p.participating && p.active).map(p=>p.id), name) : null;
  const gameResult = ['intermission','finished'].includes(room.phase) && room.lastGame ? gameAnnouncement(language, room.lastGame.game, room.lastGame.winnerId ? name(room.lastGame.winnerId) : null, room.players.filter(p=>p.participating).map(p=>`${p.nickname} ${p.score}`).join(', ')) : null;
  const announcement = gameResult ?? roundAnnouncement;
  const message = error ? t(error) : !connected ? t('Reconnecting…') : announcement ? announcement.headline : room.phase === 'finished' ? room.championId ? t('{name} is the champion!', { name: name(room.championId) }) : t('Not enough players remain.') : room.phase === 'intermission' ? room.winnerId ? t('{name} wins · next game shortly', { name: name(room.winnerId) }) : t('Draw · next game shortly') : room.phase === 'countdown' ? t('Clap! {count}', { count: Math.max(1, Math.min(3, Math.ceil(((room.phaseEndsAt ?? now) + serverOffset - now) / 240))) }) : shown ? latest?.events[0] ? attackMessage(language, latest.events[0], name) : t('Everyone survives') : !active ? t('Spectating') : locked ? t('Waiting for players…') : needsTarget ? target ? t('{move} → {name}', { move: moveLabel(draft), name: name(target) }) : t('Choose a target') : t('Choose your move');
  function fighter(player: RoomPlayer, facing: 'left' | 'right') {
    const action = latest?.actions.find(a => a.playerId === player.id);
    return <article className={`battle-fighter ${player.id !== me.id ? 'opponent' : ''} ${player.id === target ? 'is-target' : ''} ${!player.active ? 'is-eliminated' : ''}`} ref={el => { if (el) elements.current.set(player.id, el); else elements.current.delete(player.id); }}><div className="battle-fighter-heading"><strong>{player.nickname}</strong><span>{player.ammo} {t('ammo')}{!player.active && <small>{t('Eliminated')}</small>}</span></div><div className="battle-character"><ReactionBubble events={room.activity} actorId={player.id} muted={reactions.muted} offset={serverOffset}/><Character profile={player.profile} state={stateFor(player, room)} move={action?.move} facing={facing} reduced={reduced} cycle={room.roundId + '-' + room.phase}/></div><div className="battle-revealed-move">{action ? revealedMoveLabel(language, action.move, action.targetId ? name(action.targetId) : undefined) : player.locked ? t('Move locked') : ''}</div></article>;
  }
  return <BattleShell phase={room.phase} header={<><div className="battle-topline"><button className="battle-icon" onClick={exit} aria-label={t('Leave room')}>←</button><div className="battle-round"><strong>{t('Game {game} · Round {round}', { game: room.gameNumber, round: room.round })}</strong><span>{t('First to {target} wins', { target: room.settings.winsRequired })}</span></div><div className="battle-timer" role="timer" aria-label={t('Move-round time remaining')}><strong>{room.phase === 'choosing' ? Math.max(0, Math.min(room.settings.roundSeconds, Math.ceil(((room.phaseEndsAt ?? now) + serverOffset - now) / 1000))) : '—'}{room.phase === 'choosing' ? t('s') : ''}</strong></div><BattleMenu onHelp={onHelp} onHistory={() => setSheet('history')} onStandings={() => setSheet('standings')} onSettings={onSettings}/></div><div className="battle-scoreline" aria-label={t('Match scoreboard')}><span><strong>{me.nickname}</strong><b>{me.score} / {room.settings.winsRequired}</b></span><span className="leader-score"><strong>{t('Leader: {name}', { name: leader.nickname })}</strong><b>{leader.score} / {room.settings.winsRequired}</b></span></div></>}
  arena={<div className={'room-battle-arena phase-' + room.phase} style={{ '--phase-delay': `-${delay}ms` } as CSSProperties}><div className="duel-arena">{fighter(me, 'right')}<div className="duel-center"><span>{t('vs')}</span></div>{opponent && fighter(opponent, 'left')}</div><div className="opponent-rail" role="group" aria-label={t('Attack target')}>{others.map(player => <button key={player.id} className={`opponent-chip ${target === player.id ? 'is-target' : ''} ${opponent?.id === player.id ? 'is-preview' : ''} ${!player.active ? 'is-eliminated' : ''}`} ref={player.id === opponent?.id ? undefined : el => { if (el) elements.current.set(player.id, el); else elements.current.delete(player.id); }} aria-label={canChoose && player.active ? t('Target {name}', { name: player.nickname }) : t('View {name}', { name: player.nickname })} aria-pressed={target === player.id} onClick={() => { setFocusId(player.id); if (canChoose && player.active) setTarget(player.id); }}><Avatar profile={player.profile} size={32} decorative/><span><strong>{player.nickname}</strong><span>{player.ammo} {t('ammo')} · {player.active ? player.locked ? t('Locked in') : t('Active') : t('Eliminated')}</span>{shown && latest?.actions.find(a=>a.playerId===player.id) && <span className="opponent-revealed-move" title={revealedMoveLabel(language, latest.actions.find(a=>a.playerId===player.id)!.move, latest.actions.find(a=>a.playerId===player.id)!.targetId ? name(latest.actions.find(a=>a.playerId===player.id)!.targetId!) : undefined)}>{revealedMoveLabel(language, latest.actions.find(a=>a.playerId===player.id)!.move, latest.actions.find(a=>a.playerId===player.id)!.targetId ? name(latest.actions.find(a=>a.playerId===player.id)!.targetId!) : undefined)}</span>}{opponent?.id !== player.id && <ReactionBubble events={room.activity} actorId={player.id} muted={reactions.muted} offset={serverOffset}/>}</span>{target === player.id && <b aria-hidden="true">✓</b>}</button>)}</div>{room.phase === 'reveal' && latest?.events.length ? <AttackLines room={room} elements={elements}/> : null}</div>}
  result={<ActivityBar events={room.activity} readyAt={room.reactionReadyAt} offset={serverOffset} reactionMuted={reactions.muted} onToggleMute={reactions.toggle} onReaction={(reaction, requestId) => send({ type: "reaction", reaction, requestId, matchId: room.activityMatchId })} status={message} detail={announcement?.detail}/>} controls={<><MovePanel ammo={me.ammo} disabled={!canChoose} selected={draft} locked={locked || shown} onChoose={setDraft}/><div className="battle-lockrow"><button className="battle-lock-button" disabled={room.phase === 'finished' ? !isHost || !connected : !canLock} onClick={room.phase === 'finished' ? () => send({ type: 'again' }) : submit}>{room.phase === 'finished' ? t('Rematch') : !active ? t('Spectating') : room.phase === 'intermission' ? t('Next game shortly…') : shown ? t('Round resolving…') : locked ? t('Waiting for players…') : t('Lock my move')}</button></div>{sheet && <BattleSheet title={t(sheet === 'history' ? 'Activity' : 'Standings')} onClose={() => setSheet(null)}>{sheet === 'history' ? <ActivityFeed events={room.activity}/> : <><p>{t('First to {target} wins', { target: room.settings.winsRequired })}</p><ol className="battle-standings">{[...room.players].sort((a, b) => b.score - a.score).map(player => <li key={player.id}><Avatar profile={player.profile} size={40} decorative/><div><strong>{player.nickname}</strong><span>{player.active ? t('Active') : t('Eliminated')} · {player.ammo} {t('ammo')}</span></div><b>{player.score} / {room.settings.winsRequired}</b></li>)}</ol>{room.phase === 'finished' && <><h3>{t('Final game placements')}</h3><ol className="battle-placements">{room.placements.map(group => <li key={group.rank}><b>#{group.rank}</b> {group.playerIds.map(name).join(', ')}{group.playerIds.length > 1 && <span> · {t('TIED')}</span>}</li>)}</ol></>}</>}</BattleSheet>}</>}/>;
}

export function Multiplayer({ profile, reduced, onChooseAvatar, onSelectProfile, onBattleChange, muted, onMute, onHelp, onExit, onSettings }: { profile: AvatarProfile; reduced: boolean; onChooseAvatar: () => void; onSelectProfile: (profile: AvatarProfile) => void; onBattleChange: (active: boolean) => void; muted: boolean; onMute: () => void; onHelp: () => void; onExit: () => void; onSettings: () => void }) {
  const { t, language, move: moveLabel } = useLanguage();
  const { room, connection, error, serverOffset, send, leave } = useRoom();
  useEffect(() => { onBattleChange(Boolean(room && room.phase !== 'lobby')); return () => onBattleChange(false); }, [room?.phase, onBattleChange]);
  const [nickname, setNickname] = useState(() => { try { return localStorage.getItem('ching.nickname') ?? ''; } catch { return ''; } });
  const preset = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>(preset ? 'join' : 'menu');
  const [code, setCode] = useState(preset);
  const [draft, setDraft] = useState<MoveId>('reload');
  const [target, setTarget] = useState<string | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<Difficulty>('normal');
  const [settingsValid, setSettingsValid] = useState(true);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const elements = useRef(new Map<string, HTMLElement>());
  const previousProfile = useRef('');
  const me = room?.players.find(p => p.id === room.selfId);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(timer); }, []);
  useEffect(() => { setPending(false); setDraft('reload'); setTarget(null); }, [room?.roundId]);
  useEffect(() => {
    if (room?.selfAction) { setDraft(room.selfAction.move); setTarget(room.selfAction.targetId ?? null); }
  }, [room?.selfAction?.move, room?.selfAction?.targetId, room?.roundId]);
  useEffect(() => { if (error || me?.locked) setPending(false); }, [error, me?.locked]);
  useEffect(() => {
    if (connection !== 'connected') { previousProfile.current = ''; return; }
    if (!room || room.phase !== 'lobby' || !me) return;
    const signature = JSON.stringify(profile);
    if (JSON.stringify(me.profile) !== signature && previousProfile.current !== `${room.code}-${signature}`) {
      previousProfile.current = `${room.code}-${signature}`; send({ type: 'profile', profile });
    }
  }, [profile, room, me, connection, send]);
  const delay = useMemo(() => {
    if (!room?.phaseEndsAt) return 0;
    const duration = room.phase === 'countdown' ? 720 : room.phase === 'reveal' ? 420 : 880;
    return Math.min(duration, Math.max(0, Date.now() - (room.phaseEndsAt + serverOffset - duration)));
  }, [room?.phase, room?.roundId, room?.phaseEndsAt]);
  function enter(event: FormEvent) {
    event.preventDefault(); try { localStorage.setItem('ching.nickname', nickname.trim()); } catch { /* Guest still works. */ }
    if (mode === 'create') send({ type: 'create', nickname, profile });
    else send({ type: 'join', code, nickname, profile });
  }
  function exit() { leave(); const url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(null, '', url); onExit(); }
  const connected = connection === 'connected';
  const connectionLabel = connection === 'disconnected' ? t('Disconnected from room server.') : connection === 'reconnecting' ? t('Reconnecting…') : t('Connecting to room server…');
  if (!room && mode === 'menu') return <section className="multiplayer-hub"><div className="flow-header"><button className="back-button" onClick={exit} aria-label={t('Back')}>←</button><h1>{t('Multiplayer')}</h1></div>{!connected && <p className="connection-banner" role="status">{connectionLabel}</p>}{error && <p className="room-error" role="alert">{t(error)}</p>}<div className="hub-art"><Character profile={profile} state="idle" reduced={reduced}/></div><div className="home-modes"><button className="mode-button primary-mode" onClick={() => setMode('create')}><strong>{t('Create Room')}</strong><b aria-hidden="true">→</b></button><button className="mode-button secondary-mode" onClick={() => setMode('join')}><strong>{t('Join Room')}</strong><b aria-hidden="true">→</b></button></div></section>;
  if (!room) return <section className="room-entry focused-entry"><div className="flow-header"><button className="back-button" onClick={() => setMode('menu')} aria-label={t('Back')}>←</button><h1>{t(mode === 'create' ? 'Create Room' : 'Join Room')}</h1></div><CharacterSelect profile={profile} onSelect={onSelectProfile} onMore={onChooseAvatar} reduced={reduced}/><form onSubmit={enter}><label>{t('Your nickname')}<input value={nickname} onInvalid={e => e.currentTarget.setCustomValidity(t('Enter a nickname.'))} onChange={e => { e.currentTarget.setCustomValidity(''); setNickname(e.target.value); }} autoComplete="nickname" maxLength={20} required placeholder={t('What should your friends call you?')}/></label>{mode === 'join' && <label>{t('Room code')}<input value={code} onInvalid={e => e.currentTarget.setCustomValidity(t('Enter a six-character room code.'))} onChange={e => { e.currentTarget.setCustomValidity(''); setCode(e.target.value.toUpperCase().replace(/\s/g, '')); }} maxLength={6} required minLength={6} autoCapitalize="characters" placeholder="ABC234"/></label>}<div className="setup-dock"><button className="play-button" type="submit" disabled={!connected}>{connected ? t(mode === 'create' ? 'Create Room' : 'Join Room') : connectionLabel}<span aria-hidden="true">→</span></button></div><p className="room-error" role="alert">{t(error)}</p></form></section>;
  const name = (id: string) => room.players.find(p => p.id === id)?.nickname ?? t('PLAYER');
  const isHost = room.hostId === room.selfId;
  const locked = Boolean(me?.locked || pending);
  const canChoose = connected && room.phase === 'choosing' && Boolean(me?.active && me.participating && !me.forfeitPending) && !locked;
  const needsTarget = MOVES[draft].kind === 'attack';
  const canLock = canChoose && MOVES[draft].cost <= (me?.ammo ?? 0) && (!needsTarget || room.players.some(p => p.id === target && p.active && p.id !== room.selfId));
  const lobbyPlayers = room.players.filter(p => !p.left);
  const canStart = settingsValid && lobbyPlayers.length >= 2 && lobbyPlayers.every(p => p.connected && p.ready);
  function submit() {
    if (!canLock) return;
    if (send({ type: 'lock', roundId: room!.roundId, move: draft, ...(needsTarget ? { targetId: target! } : {}) })) setPending(true);
  }
  if (room.phase !== 'lobby') return <RoomBattle room={room} connected={connected} error={error} serverOffset={serverOffset} now={now} reduced={reduced} muted={muted} onMute={onMute} onHelp={onHelp} onSettings={onSettings} exit={exit} draft={draft} target={target} setDraft={setDraft} setTarget={setTarget} locked={locked} canChoose={canChoose} canLock={canLock} submit={submit} send={send} delay={delay} elements={elements}/>;
  return <section className="multiplayer"><div className="room-topbar"><div><div className="eyebrow">{t('PRIVATE ROOM ·')}{room.code}</div><h1>{t('The crew’s here')}</h1></div><button className="room-secondary" onClick={exit}>{t('Leave room')}</button></div>{!connected && <p className="connection-banner" role="status">{t('Reconnecting… Your place is held for 20 seconds after a disconnect.')}</p>}<p className="room-error" role="alert">{t(error)}</p><Invite code={room.code}/>{isHost ? <MatchOptions value={room.settings} onChange={settings => send({ type: 'settings', settings })} onValidity={setSettingsValid}/> : <div className="guest-settings"><strong>{t('{seconds} seconds per move round · First to {target} wins', { seconds: room.settings.roundSeconds, target: room.settings.winsRequired })}</strong><p>{t('Unsubmitted moves become Block 1 when time expires. Only the host can change settings; changes clear human ready status.')}</p></div>}{isHost && <div className="bot-controls"><label>{t('Bot difficulty')}<select value={botDifficulty} onChange={e => setBotDifficulty(e.target.value as Difficulty)}>{(['easy', 'normal', 'hard'] as const).map(d => <option key={d} value={d}>{t(d)}</option>)}</select></label><button className="room-secondary" disabled={!connected || lobbyPlayers.length >= 8} onClick={() => send({ type: 'addBot', difficulty: botDifficulty })}>{t('+ Add bot')}</button><p>{t('Bots are always ready. Adding or removing one clears human readiness.')}</p></div>}
    <div className="room-roundbar"><p role="status">{t('Get the crew ready.')}</p><span>{t('{count}/8 players', { count: lobbyPlayers.length })}</span></div>
    <div className="mp-arena" style={{ '--room-columns': Math.min(4, Math.max(2, room.players.length)), '--room-character-height': room.players.length <= 2 ? '235px' : '180px' } as CSSProperties}>{room.players.map((player, index) => <article key={player.id} className={'mp-fighter ' + (player.id === room.selfId ? 'is-you' : '')}><div className="mp-player-heading"><span><Avatar profile={player.profile} size={32} decorative/><strong>{player.nickname}<small>{player.id === room.selfId ? t('YOU') : player.botDifficulty ? t('{difficulty} bot', { difficulty: t(player.botDifficulty) }) : player.id === room.hostId ? t('HOST') : t('PLAYER')}{player.id === room.selfId && isHost ? t(' · HOST') : ''}</small></strong></span></div><div className="mp-character"><Character profile={player.profile} state="idle" facing={index % 2 ? 'left' : 'right'} reduced={reduced}/></div><p className={'mp-player-status ' + (player.ready ? 'is-ready' : '')}>{t(player.ready ? 'Ready' : 'Not ready')}</p>{player.id === room.selfId ? <button className="room-secondary character-change" onClick={onChooseAvatar}>{t('Change character')}</button> : isHost && player.botDifficulty ? <button className="room-secondary" onClick={() => send({ type: 'removeBot', playerId: player.id })}>{t('Remove bot')}</button> : <div className="card-footer-placeholder"/>}</article>)}</div>
    <div className="lobby-controls"><button className={'room-secondary ready-button ' + (me?.ready ? 'is-ready' : '')} disabled={!connected || !settingsValid} onClick={() => send({ type: 'ready', ready: !me?.ready })}>{me?.ready ? t('✓ Ready — click to unready') : t('I’m ready')}</button>{isHost ? <button className="play-button" disabled={!connected || !canStart} onClick={() => send({ type: 'start' })}>{t('Start match')}<span>↗</span></button> : <p>{t('The host starts when everyone is ready.')}</p>}<p>{lobbyPlayers.length < 2 ? t('Invite a friend to start. You need at least 2 players.') : !canStart ? t('Every player must be connected and ready.') : t('Everyone’s ready. Let’s Ching!')}</p></div>
    <details className="multiplayer-rules"><summary>{t("How multiplayer works")}</summary><p>{t('help.multiplayerMatch', { target: room.settings.winsRequired })}</p><p>{t("Everyone starts at 0 ammo. Reload, block, or attack one active target. Choices and targets stay secret until all active players lock. Attacks cost ammo once, including blocked and canceled attacks. A matching block stops every incoming attack it covers; any uncovered hit eliminates you.")}</p><p>{t("When two players attack each other, the stronger attack wins and equal attacks cancel. Attacking never protects you from a third player. Every legal attack resolves, even if its attacker is eliminated that round. The last survivor wins; everyone eliminated together is a draw. Players eliminated in the same round share a placement.")}</p><p>{t("Disconnected players get 20 seconds to reconnect. After that they are eliminated at a round boundary. The host role transfers when the host leaves or disconnects. New arrivals watch the active match and join the next lobby. Inactive rooms close after 30 minutes (or 5 minutes with nobody connected).")}</p></details>
  </section>;
}


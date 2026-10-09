import { useAppPreferences } from './AppPreferencesContext';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { BattleSheet } from './BattleUI';
import { useLanguage } from './i18n/react';
import { REACTIONS, REACTION_COOLDOWN, BUBBLE_MS, activityText, type ActivityEvent, type ReactionId } from './activity';

export function useReactionMute() {
  const {preferences,update}=useAppPreferences();
  return {muted:preferences.reactionMuted,toggle:()=>update('reactionMuted',!preferences.reactionMuted)};
}
export function ReactionBubble({ events, actorId, muted, offset = 0 }: { events: ActivityEvent[]; actorId: string; muted: boolean; offset?: number }) {
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now());
  const event = [...events].reverse().find(event => event.kind === 'reaction' && event.sender.id === actorId);
  useEffect(() => { setNow(Date.now()); if (!event) return; const timer = setTimeout(() => setNow(Date.now()), Math.max(0, event.at + offset + BUBBLE_MS - Date.now()) + 10); return () => clearTimeout(timer); }, [event?.id, offset]);
  if (muted || !event || event.kind !== 'reaction' || Math.max(now, Date.now()) >= event.at + offset + BUBBLE_MS) return null;
  const reaction = REACTIONS.find(reaction => reaction.id === event.reaction)!;
  return <div className="reaction-bubble" key={event.id} role="status"><span aria-hidden="true">{reaction.icon}</span>{t(reaction.text)}</div>;
}
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const { t, language } = useLanguage();
  const list = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  useEffect(() => { if (following.current && list.current) list.current.scrollTop = list.current.scrollHeight; }, [events.length]);
  return <div ref={list} className="activity-feed" role="log" aria-live="polite" aria-label={t('Match activity')} onScroll={event => { const el = event.currentTarget; following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>{events.length === 0 ? <p>{t('Activity appears here as the match unfolds.')}</p> : events.map(event => {
    const text = activityText(language, event);
    const actor = event.kind === 'reaction' ? event.sender : event.kind === 'game' || event.kind === 'match' ? event.actors.find(actor => actor.id === event.winnerId) : undefined;
    return <article key={event.id} className={'activity-event activity-' + event.kind} data-event-id={event.id}>{actor && <Avatar profile={actor.profile} size={36} decorative/>}<div><strong>{text.label}</strong>{event.kind === 'reaction' && <span className="activity-reaction-icon" aria-hidden="true">{REACTIONS.find(reaction => reaction.id === event.reaction)!.icon}</span>}{text.lines.map((line, index) => <p key={index}>{line}</p>)}</div></article>;
  })}</div>;
}
export function ActivityBar({ events, readyAt, onReaction, reactionMuted, onToggleMute, offset = 0, status, detail }: { status: string; detail?: string; events: ActivityEvent[]; readyAt: number; onReaction: (reaction: ReactionId, requestId: string) => boolean; reactionMuted: boolean; onToggleMute: () => void; offset?: number }) {
  const { t, language } = useLanguage();
  const [sheet, setSheet] = useState<'activity' | 'reactions' | null>(null);
  const [now, setNow] = useState(Date.now());
  const [localReadyAt, setLocalReadyAt] = useState(0);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(interval); }, []);
  const seconds = Math.max(0, Math.ceil((Math.max(readyAt + offset, localReadyAt) - Math.max(now, Date.now())) / 1000));
  const last = events.at(-1), text = last ? activityText(language, last) : null;
  return <><div className="activity-bar"><span className="activity-latest"><strong title={status}>{status}</strong><span title={detail ?? (text ? [text.label, ...text.lines].join(' ') : '')}>{detail !== undefined ? detail : text ? last?.kind === 'reaction' ? `${text.label}: ${text.lines[0]}` : last?.kind === 'round' ? `${text.label}: ${text.lines.at(-1) ?? ''}` : text.label : t('Match activity')}</span></span><button onClick={() => setSheet('activity')}>{t('Activity')}</button><button aria-label={t('Send a reaction')} onClick={() => setSheet('reactions')} disabled={seconds > 0}>{seconds > 0 ? `${seconds}${t('s')}` : '☺'}</button></div>{sheet && <BattleSheet title={t(sheet === 'activity' ? 'Activity' : 'Reactions')} onClose={() => setSheet(null)}>{sheet === 'activity' ? <><label className="reaction-mute"><input type="checkbox" checked={reactionMuted} onChange={onToggleMute}/>{t('Hide reaction bubbles')}</label><ActivityFeed events={events}/></> : <><div className="reaction-picker">{REACTIONS.map(reaction => <button key={reaction.id} disabled={seconds > 0} onClick={() => { if (onReaction(reaction.id, crypto.randomUUID())) { setLocalReadyAt(Date.now() + REACTION_COOLDOWN); setSheet(null); } }}><span aria-hidden="true">{reaction.icon}</span><strong>{t(reaction.text)}</strong></button>)}</div><p>{t('Reactions have a three-second cooldown.')}</p><label className="reaction-mute"><input type="checkbox" checked={reactionMuted} onChange={onToggleMute}/>{t('Hide reaction bubbles')}</label></>}</BattleSheet>}</>;
}

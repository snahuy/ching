import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { Character } from './Character';
import { AVATARS, avatarById, type AvatarProfile } from './avatars';
import { useLanguage } from './i18n/react';
export function CharacterSelect({ profile, onSelect, onMore, reduced }: { profile: AvatarProfile; onSelect: (profile: AvatarProfile) => void; onMore: () => void; reduced: boolean }) {
  const { t } = useLanguage();
  const [reaction, setReaction] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => { setReaction(true); const timer = setTimeout(() => setReaction(false), 650); return () => clearTimeout(timer); }, [profile.avatarId]);
  useEffect(() => { rail.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }); }, []);
  return <section className="character-selection" aria-label={t('Choose character')}>
    <div className="setup-preview"><Character profile={profile} state={reaction ? 'victory' : 'idle'} reduced={reduced} cycle={profile.avatarId}/></div>
    <div className="character-selection-heading"><strong>{avatarById(profile.avatarId).name}</strong><button className="text-control" onClick={onMore}>{t('All characters & colors')}</button></div>
    <div className="character-rail" ref={rail} role="group" aria-label={t('Choose character')}>{AVATARS.map((avatar, index) => <button key={avatar.id} className={profile.avatarId === avatar.id ? 'chosen' : ''} aria-pressed={profile.avatarId === avatar.id} aria-label={avatar.name} tabIndex={profile.avatarId === avatar.id ? 0 : -1} onClick={() => onSelect({ ...profile, avatarId: avatar.id })} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % AVATARS.length : event.key === 'ArrowLeft' ? (index + AVATARS.length - 1) % AVATARS.length : event.key === 'Home' ? 0 : event.key === 'End' ? AVATARS.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault(); const button = rail.current?.children[next] as HTMLButtonElement; button?.focus(); button?.scrollIntoView({ block: 'nearest', inline: 'center' }); onSelect({ ...profile, avatarId: AVATARS[next].id });
    }}><Avatar profile={{ ...profile, avatarId: avatar.id }} size={48} decorative/><span>{avatar.name}</span>{profile.avatarId === avatar.id && <b aria-hidden="true">✓</b>}</button>)}</div>
  </section>;
}

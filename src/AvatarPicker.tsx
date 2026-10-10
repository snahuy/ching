import { useLanguage } from './i18n/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Avatar } from './Avatar';
import { Character } from './Character';
import { CHARACTER_STATES, STATE_LABELS, type CharacterState } from './characterState';
import { AVATARS, BACKGROUNDS, CATEGORIES, avatarById, backgroundById, randomAvatar, type AvatarProfile, type Category, type AvatarId } from './avatars';

export function AvatarPicker({ profile, onSave, onClose, reduced = false, opponent = false, immediate = false }: { profile: AvatarProfile; onSave: (profile: AvatarProfile) => void; onClose: () => void; reduced?: boolean; opponent?: boolean; immediate?: boolean }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(profile);
  const [previewState, setPreviewState] = useState<CharacterState>('idle');
  const [category, setCategory] = useState<Category>('All');
  const [focusedId, setFocusedId] = useState<AvatarId>(profile.avatarId);
  const dialog = useRef<HTMLDialogElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const visible = AVATARS.filter(a => category === 'All' || a.category === category);
  const entryId = visible.some(a => a.id === focusedId) ? focusedId : visible[0].id;
  const selected = avatarById(draft.avatarId);
  useEffect(() => { dialog.current?.showModal(); }, []);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const columns = getComputedStyle(grid.current!).gridTemplateColumns.split(' ').length;
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, ArrowDown: index + columns, ArrowUp: index - columns, Home: 0, End: visible.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + visible.length) % visible.length;
    setFocusedId(visible[next].id);
    grid.current?.querySelectorAll<HTMLButtonElement>('button')[next].focus();
  }
  function randomize() {
    const avatarId = randomAvatar(draft.avatarId);
    setDraft(p => ({ ...p, avatarId })); setFocusedId(avatarId); setCategory('All');
  }
  return <dialog ref={dialog} className={`avatar-dialog ${immediate ? "quick-character-picker" : ""}`} aria-labelledby="avatar-title" onCancel={onClose}>
    <div className="picker-header"><div><div className="eyebrow">{t("{count} FACES. YOUR SCHOOLYARD STORY.", {count:AVATARS.length})}</div><h2 id="avatar-title">{t(opponent ? "Choose your opponent" : immediate ? "Choose your character" : "Find your Ching")}{!opponent && !immediate && <span>.</span>}</h2></div><button className="icon-button" onClick={onClose} aria-label={t("Close avatar picker")}>×</button></div>
    <div className="picker-layout">{!immediate && <aside className="avatar-preview"><div className="fullbody-preview" style={{ backgroundColor: backgroundById(draft.backgroundId).color }}><Character profile={draft} state={previewState} reduced={reduced} cycle={`${draft.avatarId}-${previewState}`}/></div><div className="preview-text" aria-live="polite"><span className="eyebrow">{t("YOUR PICK")}</span><h3>{selected.name}</h3><p>{t(selected.description)}</p></div><label className="preview-motion-label">{t("Try an animation")}<select value={previewState} onChange={e => setPreviewState(e.target.value as CharacterState)}>{CHARACTER_STATES.map(state => <option key={state} value={state}>{t(STATE_LABELS[state])}</option>)}</select></label><fieldset className="avatar-colors"><legend>{t("Background color")}</legend><div>{BACKGROUNDS.map(b => <button key={b.id} type="button" className={b.id === draft.backgroundId ? 'selected' : ''} style={{ backgroundColor: b.color }} aria-label={t('{color} background', { color: t(b.name) })} aria-pressed={b.id === draft.backgroundId} onClick={() => setDraft(p => ({ ...p, backgroundId: b.id }))}>{b.id === draft.backgroundId && <span aria-hidden="true">✓</span>}</button>)}</div></fieldset><button className="random-avatar" onClick={randomize}><span aria-hidden="true">↻</span> {t("Random Avatar")}</button><p className="guest-note">{t("All avatars are ready to play.")}<br/>{t("Your pick is saved on this device.")}</p></aside>}
    <div className="avatar-collection"><div className="avatar-filters" role="group" aria-label={t("Avatar categories")}>{CATEGORIES.map(c => <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={category === c ? 'active' : ''}>{t(c)}</button>)}</div><div className="collection-heading"><span>{category === 'All' ? t("THE WHOLE CREW") : t(category)}</span><span>{t('{count} avatars', { count: visible.length })}</span></div><div ref={grid} className="avatar-grid" role="group" aria-label={t("Choose an avatar. Arrow keys navigate, Enter or Space selects.")}>{visible.map((a, index) => <button key={a.id} className={`avatar-option ${draft.avatarId === a.id ? 'selected' : ''}`} aria-label={`${a.name}, ${t(a.category)}. ${t(a.description)}`} aria-pressed={draft.avatarId === a.id} tabIndex={entryId === a.id ? 0 : -1} onFocus={() => setFocusedId(a.id)} onKeyDown={e => navigate(e, index)} onClick={() => immediate ? onSave({ ...draft, avatarId:a.id }) : setDraft(p => ({ ...p, avatarId: a.id }))}><Avatar profile={{ ...draft, avatarId: a.id }} size={64} decorative/><strong>{a.name}</strong>{draft.avatarId === a.id && <span className="avatar-check" aria-hidden="true">✓</span>}</button>)}</div><p className="keyboard-hint">{t("Arrow keys to explore · Enter or Space to select")}</p></div></div>
    {!immediate && <div className="picker-footer"><button className="how-button" onClick={onClose}>{t("Cancel")}</button><button className="play-button" onClick={() => onSave(draft)}>{t('Use {name}', { name: selected.name })}<span aria-hidden="true">✓</span></button></div>}
  </dialog>;
}

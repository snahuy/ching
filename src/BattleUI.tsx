import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from './i18n/react';
import { GearIcon } from './SettingsPage';
import { Gesture } from './Gesture';
import { MOVES, MOVE_LIST, type MoveId } from './rules';

export function BattleSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); opener?.focus(); };
  }, []);
  return <dialog ref={dialog} className="battle-sheet" aria-label={title} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="sheet-heading"><h2>{title}</h2><button className="battle-icon" onClick={onClose} aria-label={t('Close')}>×</button></div>{children}</dialog>;
}

export function BattleMenu({ onHelp, onHistory, onStandings, onSettings }: { onHelp: () => void; onHistory: () => void; onStandings?: () => void; onSettings: () => void }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  function openSheet(action: () => void) { setOpen(false); requestAnimationFrame(action); }
  return <><button className="battle-icon" onClick={() => setOpen(true)} aria-label={t('Game menu')} aria-haspopup="dialog">☰</button>{open && <BattleSheet title={t('Game menu')} onClose={() => setOpen(false)}><button className="sheet-action gear-menu-action" onClick={() => openSheet(onSettings)}><GearIcon/>{t('Settings')}</button><button className="sheet-action" onClick={() => openSheet(onHelp)}>{t('How to play')}</button><button className="sheet-action" onClick={() => openSheet(onHistory)}>{t('Activity')}</button>{onStandings && <button className="sheet-action" onClick={() => openSheet(onStandings)}>{t('Standings')}</button>}</BattleSheet>}</>;
}

export function BattleShell({ header, arena, result, controls, phase }: { header: ReactNode; arena: ReactNode; result: ReactNode; controls: ReactNode; phase: string }) {
  const shell = useRef<HTMLElement>(null);
  const fontProbe = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    function resize() {
      // Pinch zoom keeps a scrollable document rather than squeezing its controls.
      const visual = window.visualViewport;
      const height = visual && visual.scale === 1 ? Math.min(window.innerHeight, visual.height) : window.innerHeight;
      shell.current?.style.setProperty('--battle-height', `${height}px`);
    }
    resize(); window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
    const fontObserver = new ResizeObserver(() => {
      shell.current?.classList.toggle('battle-large-text', (fontProbe.current?.getBoundingClientRect().width ?? 16) > 18);
    });
    if (fontProbe.current) fontObserver.observe(fontProbe.current);
    return () => { fontObserver.disconnect(); window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); };
  }, []);
  return <section ref={shell} className="battle-shell" data-phase={phase}><span ref={fontProbe} className="battle-font-probe" aria-hidden="true"/><header className="battle-header">{header}</header><div className="battle-stage">{arena}<div className="battle-result" role="status" aria-live="polite">{result}</div></div><div className="battle-controls">{controls}</div></section>;
}

export function MovePanel({ ammo, disabled, selected, locked, onChoose }: { ammo: number; disabled: boolean; selected?: MoveId; locked?: boolean; onChoose: (move: MoveId) => void }) {
  const { t, move: moveLabel } = useLanguage();
  return <div className="battle-moves" role="group" aria-label={t('Choose your move')}>{MOVE_LIST.map(move => {
    const unavailable = move.cost > ammo;
    const state = selected === move.id ? locked ? 'locked' : 'selected' : unavailable ? 'unaffordable' : disabled ? 'waiting' : 'available';
    return <button key={move.id} type="button" className={`battle-move ${move.kind} ${state}`} data-move={move.id} data-state={state} disabled={disabled || unavailable} aria-pressed={selected === move.id} aria-label={`${moveLabel(move.id)}, ${move.kind === 'reload' ? t('+1 ammo') : t('{count} ammo', { count: move.cost })}${unavailable ? `, ${t('Need more ammo')}` : ''}`} title={t(move.gesture)} onClick={() => onChoose(move.id)}><Gesture move={move.id} icon/><strong>{move.id === 'reload' ? t('Reload short') : moveLabel(move.id)}</strong><span className="battle-move-cost">{move.kind === 'reload' ? '+1' : move.cost} <span>{t('ammo')}</span></span>{state === 'locked' && <span className="move-lock" aria-label={t('Move locked')}>✓</span>}</button>;
  })}</div>;
}

export function MoveHelp() {
  const { t, move: moveLabel } = useLanguage();
  return <><p>{t('Time runs out? Your move locks automatically as Block 1. The timer pauses during animations. Each game winner earns 1 point; draws earn none.')}</p><div className="battle-help-moves">{MOVE_LIST.map(move => <div key={move.id}><Gesture move={move.id} icon/><div><h3>{moveLabel(move.id)} <span>{t('{count} ammo', { count: MOVES[move.id].cost })}</span></h3><p>{t(move.gesture)}</p>{move.kind === 'block' && <p>{t('Stops {moves}', { moves: move.stops.map(moveLabel).join(' / ') })}</p>}</div></div>)}</div></>;
}

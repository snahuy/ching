import { useLanguage } from './i18n/react';
import { useEffect, useId, useState } from 'react';
import { validateMatchSettings, type MatchSettings } from './match';
export function MatchOptions({ value, onChange, onValidity, disabled = false }: { value: MatchSettings; onChange: (s: MatchSettings) => void; onValidity?: (valid: boolean) => void; disabled?: boolean }) {
  const { t } = useLanguage();
  const id = useId();
  const [timerMode, setTimerMode] = useState([5, 10, 15].includes(value.roundSeconds) ? String(value.roundSeconds) : 'custom');
  const [winsMode, setWinsMode] = useState([5, 10].includes(value.winsRequired) ? String(value.winsRequired) : 'custom');
  const [seconds, setSeconds] = useState(String(value.roundSeconds)), [wins, setWins] = useState(String(value.winsRequired));
  const [error, setError] = useState('');
  useEffect(() => { setSeconds(String(value.roundSeconds)); setWins(String(value.winsRequired)); }, [value.roundSeconds, value.winsRequired]);
  function change(nextSeconds: string, nextWins: string) {
    setSeconds(nextSeconds); setWins(nextWins);
    try {
      if (!nextSeconds.trim() || !nextWins.trim()) throw new Error('Enter the custom value before starting.');
      const next = validateMatchSettings({ roundSeconds: Number(nextSeconds), winsRequired: Number(nextWins) });
      setError(''); onValidity?.(true); onChange(next);
    } catch (e) { setError((e as Error).message); onValidity?.(false); }
  }
  return <fieldset className="match-options" disabled={disabled}><legend>{t("Match settings")}</legend><div className="match-option-fields"><div><label htmlFor={`${id}-timer`}>{t("Move-round timer")}</label><select id={`${id}-timer`} value={timerMode} onChange={e => { setTimerMode(e.target.value); if (e.target.value !== 'custom') change(e.target.value, wins); }}>{[5, 10, 15].map(n => <option value={n} key={n}>{t('{count} seconds', { count: n })}</option>)}<option value="custom">{t("Custom seconds")}</option></select>{timerMode === 'custom' && <label className="custom-option">{t("Seconds (1–300)")}<input type="number" inputMode="numeric" min="1" max="300" step="1" value={seconds} onChange={e => change(e.target.value, wins)}/></label>}</div><div><label htmlFor={`${id}-wins`}>{t("Match target")}</label><select id={`${id}-wins`} value={winsMode} onChange={e => { setWinsMode(e.target.value); if (e.target.value !== 'custom') change(seconds, e.target.value); }}><option value="5">{t("First to 5 wins")}</option><option value="10">{t("First to 10 wins")}</option><option value="custom">{t("Custom wins")}</option></select>{winsMode === 'custom' && <label className="custom-option">{t("Wins (1–100)")}<input type="number" inputMode="numeric" min="1" max="100" step="1" value={wins} onChange={e => change(seconds, e.target.value)}/></label>}</div></div><p className="settings-summary">{t('{seconds} seconds per move round · First to {target} wins', { seconds: value.roundSeconds, target: value.winsRequired })}</p><details className="settings-help"><summary>{t("Timer & scoring rules")}</summary><p className="timeout-note">{t("Time runs out? Your move locks automatically as Block 1. The timer pauses during animations. Each game winner earns 1 point; draws earn none.")}</p></details>{error && <p className="room-error" role="alert">{t(error)}</p>}</fieldset>;
}

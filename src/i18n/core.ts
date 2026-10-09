import en from './en.json';
import km from './km.json';
import { MOVES, type MoveId, type Round } from '../rules';
import type { AttackEvent } from '../multiplayer/rules';
export type Language = 'en' | 'km';
export const LANGUAGE_KEY = 'ching.language.v1';
export type Params = Record<string, string | number>;
export const catalogs: Record<Language, Record<string, string>> = { en, km };
export function translate(language: Language, key: string, params: Params = {}): string {
  const template = catalogs[language][key] ?? catalogs.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => Object.hasOwn(params, name) ? String(params[name]) : match);
}
export function readLanguage(storage: Pick<Storage, 'getItem'>): Language {
  try { return storage.getItem(LANGUAGE_KEY) === 'km' ? 'km' : 'en'; } catch { return 'en'; }
}
export function saveLanguage(storage: Pick<Storage, 'setItem'>, language: Language) {
  try { storage.setItem(LANGUAGE_KEY, language); } catch { /* Language still switches without storage. */ }
}
export function moveName(language: Language, move: MoveId): string { return MOVES[move].kind === 'attack' ? MOVES[move].name : translate(language, MOVES[move].name); }
export function roundMessage(language: Language, round: Round): string {
  const t = (key: string, params?: Params) => translate(language, key, params);
  const p = MOVES[round.playerMove], a = MOVES[round.aiMove];
  const params = { playerMove: moveName(language, p.id), aiMove: moveName(language, a.id) };
  if (p.kind === 'attack' && a.kind === 'attack') {
    if (p.strength === a.strength) return t(round.outcome === 'draw' ? 'result.equalDraw' : 'result.equalCancel', params);
    return t('result.stronger', { winner: moveName(language, round.outcome === 'player' ? p.id : a.id), loser: moveName(language, round.outcome === 'player' ? a.id : p.id) });
  }
  if (p.kind === 'attack') return t(round.outcome === 'continue' ? 'result.playerBlocked' : a.kind === 'reload' ? 'result.playerReloadHit' : 'result.playerBreaksBlock', params);
  if (a.kind === 'attack') return t(round.outcome === 'continue' ? 'result.aiBlocked' : p.kind === 'reload' ? 'result.aiReloadHit' : 'result.aiBreaksBlock', params);
  return t(p.kind === 'reload' && a.kind === 'reload' ? 'result.bothReload' : p.kind === 'block' && a.kind === 'block' ? 'result.bothBlock' : p.kind === 'reload' ? 'result.playerReload' : 'result.aiReload');
}
export function attackMessage(language: Language, event: AttackEvent, name: (id: string) => string): string {
  return translate(language, `event.${event.result}`, { attacker: name(event.attackerId), target: name(event.targetId), move: moveName(language, event.move) });
}

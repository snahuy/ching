import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { catalogs, translate, moveName, roundMessage, attackMessage, readLanguage, saveLanguage, LANGUAGE_KEY } from './core';
import { MOVE_LIST, MOVES, resolveRound } from '../rules';
import { AVATARS, BACKGROUNDS, CATEGORIES } from '../avatars';
import { STATE_LABELS } from '../characterState';
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
describe('English and Khmer localization', () => {
  it('translates the complete catalog with matching interpolation placeholders', () => {
    expect(Object.keys(catalogs.km).sort()).toEqual(Object.keys(catalogs.en).sort());
    for (const [key, text] of Object.entries(catalogs.en)) { expect(catalogs.km[key], key).toBeTruthy(); expect(placeholders(catalogs.km[key]), key).toEqual(placeholders(text)); }
  });
  it('centralizes every static interface translation key, including accessible labels', () => {
    for (const file of ['main.tsx', 'HomeScreen.tsx', 'BattleUI.tsx', 'SettingsPage.tsx', 'SoloGameResult.tsx', 'ActivityUI.tsx', 'activity.ts', 'roundPresentation.ts', 'CharacterSelect.tsx', 'SetupRulesGuide.tsx', 'MatchOptions.tsx', 'AvatarPicker.tsx', 'Avatar.tsx', 'Character.tsx', 'multiplayer/Multiplayer.tsx', 'i18n/react.tsx']) {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function walk(node: ts.Node) {
        if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text; expect(catalogs.en[key], key).toBeTruthy(); expect(catalogs.km[key], key).toBeTruthy();
        }
        if (ts.isJsxText(node) && /[a-zA-Z]/.test(node.text)) expect(['ching', 'Ching!', 'CHING!', 'English']).toContain(node.text.trim());
        ts.forEachChild(node, walk);
      }
      walk(ast);
    }
  });
  it('covers gestures, avatar descriptions/categories/colors, and animation accessibility labels', () => {
    const keys = [...MOVE_LIST.flatMap(m => [m.name, m.gesture]), ...AVATARS.map(a => a.description), ...BACKGROUNDS.map(b => b.name), ...CATEGORIES, ...Object.values(STATE_LABELS)];
    for (const key of keys) expect(catalogs.km[key], key).toBeTruthy();
  });
  it('covers every literal server validation error and connection notice', () => {
    for (const file of ['server/rooms.ts', 'server/http.ts', 'src/match.ts', 'src/activity.ts', 'src/multiplayer/rules.ts', 'src/multiplayer/useRoom.ts']) {
      const text = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
      const errors = [...text.matchAll(/(?:new Error\(|message: |setError\()'([^']+)'/g)].map(m => m[1]);
      for (const error of errors) expect(catalogs.km[error], error).toBeTruthy();
    }
  });
  it('falls back to English if a Khmer translation is missing', () => {
    const old = catalogs.km['Let’s play']; delete catalogs.km['Let’s play'];
    try { expect(translate('km', 'Let’s play')).toBe('Let’s play'); } finally { catalogs.km['Let’s play'] = old; }
    expect(translate('km', 'A future label')).toBe('A future label');
  });
  it('interpolates names and codes verbatim without translating or interpreting markup', () => {
    expect(translate('km', 'Target {name}', { name: 'Dara <b>$&</b>' })).toBe('វាយ Dara <b>$&</b>');
    expect(translate('km', 'Scan to join private Ching room {code}', { code: 'ABC234' })).toContain('ABC234');
  });
  it('preserves attack names and localizes reload and blocks', () => {
    for (const id of ['swing', 'klarteang', 'seuteang'] as const) expect(moveName('km', id)).toBe(MOVES[id].name);
    expect(moveName('km', 'ching')).toBe('ឈីង'); expect(moveName('en', 'ching')).toBe('Ching'); expect(moveName('km', 'reload')).toBe('បញ្ចូលគ្រាប់'); expect(moveName('km', 'block1')).toBe('ការពារ ១');
  });
  it('persists the preference, defaults safely, and works when storage is unavailable', () => {
    const values = new Map<string, string>(); const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(readLanguage(storage)).toBe('en'); saveLanguage(storage, 'km'); expect(readLanguage(storage)).toBe('km'); expect(values.get(LANGUAGE_KEY)).toBe('km');
    values.set(LANGUAGE_KEY, 'unknown'); expect(readLanguage(storage)).toBe('en');
    const broken = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } }; expect(readLanguage(broken)).toBe('en'); expect(() => saveLanguage(broken, 'km')).not.toThrow();
  });
  for (const player of MOVE_LIST) for (const ai of MOVE_LIST) it(`localizes ${player.id}/${ai.id} from round data without changing its result`, () => {
    const round = resolveRound(5, 5, player.id, ai.id), original = structuredClone(round);
    expect(roundMessage('en', { ...round, message: 'ignored stored English message' })).toBe(round.message.replaceAll('គ្រាប់', 'ammo'));
    expect(roundMessage('km', round)).toMatch(/[\u1780-\u17ff]/); expect(round).toEqual(original);
  });
  it('localizes configurable equal-attack draws', () => {
    const round = resolveRound(1, 1, 'ching', 'ching', { equalAttacks: 'draw', blocksStopWeaker: false, spendFailedAttacks: true });
    expect(roundMessage('en', round)).toContain('A draw'); expect(roundMessage('km', round)).toContain('ស្មើគ្នា');
  });
  it.each(['hit', 'blocked', 'canceled', 'outmatched'] as const)('localizes multiplayer %s from structured events independently for each viewer', result => {
    const event = { attackerId: 'a', targetId: 'b', move: 'ching' as const, result }; const name = (id: string) => id === 'a' ? 'Dara' : 'Malis';
    const english = attackMessage('en', event, name), khmer = attackMessage('km', event, name);
    expect(english).toContain('Dara'); expect(khmer).toContain('Dara'); expect(khmer).toContain('Malis'); expect(khmer).toContain('ឈីង'); expect(khmer).not.toBe(english); expect(event.result).toBe(result);
  });
});

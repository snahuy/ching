import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, legalMoves, MOVE_LIST, resolveRound, type MoveId, type Outcome } from './rules';
import { chooseAI, type Difficulty } from './ai';

// Independent expected outcomes, in reload, Ching, Swing, Klarteang,
// Seuteang, Block 1, Block 2, Block 3 order. Rows are the player.
const C = 'continue', P = 'player', A = 'ai';
const matrix: Outcome[][] = [
  [C, A, A, A, A, C, C, C],
  [P, C, A, A, A, C, P, P],
  [P, P, C, A, A, C, P, P],
  [P, P, P, C, A, P, C, P],
  [P, P, P, P, C, P, P, C],
  [C, C, C, A, A, C, C, C],
  [C, A, A, C, A, C, C, C],
  [C, A, A, A, C, C, C, C],
];
describe('all 64 simultaneous move pairings', () => {
  MOVE_LIST.forEach((p, row) => MOVE_LIST.forEach((a, col) => {
    it(`${p.name} vs ${a.name}`, () => {
      const result = resolveRound(8, 8, p.id, a.id);
      expect(result.outcome).toBe(matrix[row][col]);
      expect(result.playerAmmo).toBe(8 - p.cost + (p.kind === 'reload' ? 1 : 0));
      expect(result.aiAmmo).toBe(8 - a.cost + (a.kind === 'reload' ? 1 : 0));
      expect(result.message.length).toBeGreaterThan(0);
    });
  }));
});
describe('ammo boundaries and final round resolution', () => {
  for (const attack of MOVE_LIST.filter(m => m.kind === 'attack')) {
    it(`rejects ${attack.name} if either player cannot afford it`, () => {
      expect(() => resolveRound(attack.cost - 1, 0, attack.id, 'reload')).toThrow('Insufficient ammo');
      expect(() => resolveRound(0, attack.cost - 1, 'reload', attack.id)).toThrow('Insufficient ammo');
      expect(resolveRound(attack.cost, 0, attack.id, 'reload').playerAmmo).toBe(0);
    });
    it(`deducts canceled ${attack.name} from both players`, () => {
      expect(resolveRound(attack.cost, attack.cost, attack.id, attack.id)).toMatchObject({ playerAmmo: 0, aiAmmo: 0, outcome: 'continue' });
    });
  }
  it('cannot use ammo reloaded during this round to afford an attack', () => {
    expect(() => resolveRound(0, 0, 'ching', 'reload')).toThrow();
  });
  it('applies the losing player’s reload in the final round', () => {
    expect(resolveRound(1, 0, 'ching', 'reload')).toMatchObject({ playerAmmo: 0, aiAmmo: 1, outcome: 'player' });
    expect(resolveRound(0, 1, 'reload', 'ching')).toMatchObject({ playerAmmo: 1, aiAmmo: 0, outcome: 'ai' });
  });
  it('deducts both attacks in a decisive final round', () => {
    expect(resolveRound(5, 3, 'seuteang', 'klarteang')).toMatchObject({ playerAmmo: 0, aiAmmo: 0, outcome: 'player' });
  });
  it('keeps unused ammo after blocking and reloading', () => {
    expect(resolveRound(4, 2, 'block1', 'ching')).toMatchObject({ playerAmmo: 4, aiAmmo: 1 });
    expect(resolveRound(4, 2, 'reload', 'block3')).toMatchObject({ playerAmmo: 5, aiAmmo: 2 });
  });
  it('rejects malformed ammo and unknown moves', () => {
    for (const n of [-1, 0.5, NaN, Infinity]) expect(() => resolveRound(n, 0, 'reload', 'reload')).toThrow();
    expect(() => resolveRound(0, 0, 'invalid' as MoveId, 'reload')).toThrow('Unknown move');
  });
  it('allows only free moves with zero ammo', () => {
    expect(legalMoves(0)).toEqual(['reload', 'block1', 'block2', 'block3']);
  });
});
describe('configurable local rules', () => {
  it('can end equal attacks in a draw', () => {
    expect(resolveRound(2, 2, 'swing', 'swing', { ...DEFAULT_RULES, equalAttacks: 'draw' })).toMatchObject({ outcome: 'draw', playerAmmo: 0, aiAmmo: 0 });
  });
  it('only stops listed attacks by default; optionally also stops weaker attacks', () => {
    expect(resolveRound(1, 0, 'ching', 'block3').outcome).toBe('player');
    expect(resolveRound(1, 0, 'ching', 'block3', { ...DEFAULT_RULES, blocksStopWeaker: true }).outcome).toBe('continue');
    expect(resolveRound(5, 0, 'seuteang', 'block1', { ...DEFAULT_RULES, blocksStopWeaker: true }).outcome).toBe('player');
  });
  it('can preserve ammo on failed attacks while winners still pay', () => {
    const rules = { ...DEFAULT_RULES, spendFailedAttacks: false };
    expect(resolveRound(1, 0, 'ching', 'block1', rules).playerAmmo).toBe(1);
    expect(resolveRound(2, 2, 'swing', 'swing', rules)).toMatchObject({ playerAmmo: 2, aiAmmo: 2 });
    expect(resolveRound(3, 2, 'klarteang', 'swing', rules)).toMatchObject({ playerAmmo: 0, aiAmmo: 2 });
  });
});
describe('AI fairness and legal moves', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
    it(`${difficulty} chooses only legal moves across ammo levels and random samples`, () => {
      for (let ammo = 0; ammo <= 7; ammo++) {
        for (let sample = 0; sample < 100; sample++) {
          const move = chooseAI({ playerAmmo: 7 - ammo, aiAmmo: ammo, history: [] }, difficulty, () => sample / 100);
          expect(legalMoves(ammo)).toContain(move);
        }
      }
    });
    it(`${difficulty} uses a context independent of the player’s pending choice`, () => {
      const context = { playerAmmo: 3, aiAmmo: 3, history: [resolveRound(2, 0, 'reload', 'block1')] };
      const original = structuredClone(context);
      const locked = chooseAI(context, difficulty, () => 0.42);
      MOVE_LIST.forEach(() => expect(chooseAI(context, difficulty, () => 0.42)).toBe(locked));
      expect(context).toEqual(original);
    });
  }
  it('hard adapts to previous player habits while retaining multiple possibilities', () => {
    const reloadHistory = Array.from({ length: 8 }, () => resolveRound(3, 3, 'reload', 'reload'));
    const blockHistory = Array.from({ length: 8 }, () => resolveRound(3, 3, 'block1', 'block1'));
    const reloadChoices = Array.from({ length: 100 }, (_, i) => chooseAI({ playerAmmo: 3, aiAmmo: 3, history: reloadHistory }, 'hard', () => i / 100));
    const blockChoices = Array.from({ length: 100 }, (_, i) => chooseAI({ playerAmmo: 3, aiAmmo: 3, history: blockHistory }, 'hard', () => i / 100));
    expect(reloadChoices).not.toEqual(blockChoices);
    expect(new Set(reloadChoices).size).toBeGreaterThan(3);
  });
});

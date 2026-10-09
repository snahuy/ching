import { describe, expect, it } from 'vitest';
import { addReaction, appendActivity, activityText, botRoundReaction, createActivity, REACTIONS, soloRoundActivity } from './activity';
import { DEFAULT_PROFILE } from './avatars';
import { resolveRound } from './rules';
const actors = [{ id: 'player', name: 'Dara', profile: DEFAULT_PROFILE }, { id: 'ai', name: 'Bot', profile: DEFAULT_PROFILE }];
describe('match activity', () => {
  it('accepts all presets, snapshots identity, enforces cooldown, and deduplicates retries', () => {
    let state = createActivity('match');
    REACTIONS.forEach((reaction, i) => { state = addReaction(state, actors[0], reaction.id, String(i), i * 3000); });
    expect(state.events).toHaveLength(9);
    expect(addReaction(state, actors[0], 'rematch', '8', 24001)).toBe(state);
    expect(() => addReaction(state, actors[0], 'hello', 'new', 26999)).toThrow('three seconds');
    expect(addReaction(state, actors[0], 'hello', 'new', 27000).events).toHaveLength(10);
    expect(() => addReaction(state, actors[0], 'free text', 'x', 30000)).toThrow('preset');
    expect(addReaction(state, actors[1], 'hello', 'x', 24000).events).toHaveLength(10);
  });
  it('preserves every earlier event and deduplicates scoring events', () => {
    let state = createActivity('m');
    for(let i=0;i<150;i++) state=appendActivity(state,String(i),{kind:'game',game:i,actors,winnerId:null,scores:{player:0,ai:0}},i);
    expect(state.events).toHaveLength(150);
    expect(appendActivity(state,'149',{kind:'game',game:149,actors,winnerId:'player',scores:{player:1,ai:0}},151)).toBe(state);
  });
  it.each([['reload','reload','Both reloaded'],['ching','block1','Attack blocked'],['ching','ching','equal Ching attacks canceled'],['ching','reload','Bot eliminated']] as const)('describes %s / %s without inventing a round winner', (a,b,message) => {
    const state=appendActivity(createActivity('m'),'round',soloRoundActivity(resolveRound(5,5,a,b),2,3,actors),10);
    const english=activityText('en',state.events[0]), khmer=activityText('km',state.events[0]);
    expect(english.label).toBe('Game 2 · Round 3'); expect(english.lines.join(' ')).toContain(message);
    expect(khmer.lines.join(' ')).toContain('Dara'); expect(khmer.lines.join(' ')).toMatch(/[\u1780-\u17ff]/);
    expect(english.label).not.toContain('winner');
  });
  it('localizes winners, draws and scores from event data', () => {
    const state=appendActivity(createActivity('m'),'game',{kind:'game',game:2,actors,winnerId:null,scores:{player:1,ai:1}},1);
    expect(activityText('en',state.events[0])).toEqual({label:'Game 2: draw — no points.',lines:['Score: Dara 1, Bot 1.']});
    const match=appendActivity(state,'match',{kind:'match',actors,winnerId:'player',wins:5},2);
    expect(activityText('en',match.events[1]).label).toBe('Match winner: Dara — 5 wins.');
  });
  it('bots only react occasionally to revealed blocks or equal attacks involving humans', () => {
    const attack={attackerId:'ai',targetId:'player',move:'ching' as const,result:'blocked' as const};
    expect(botRoundReaction('ai',[attack],['player'],()=>0)).toBe('niceBlock');
    expect(botRoundReaction('ai',[{...attack,result:'canceled'}],['player'],()=>0)).toBe('close');
    expect(botRoundReaction('ai',[attack],['player'],()=>1)).toBeNull();
    expect(botRoundReaction('ai',[attack],[],()=>0)).toBeNull();
    expect(botRoundReaction('ai',[{...attack,result:'hit'}],['player'],()=>0)).toBeNull();
    expect(botRoundReaction('ai',[],['player'],()=>0)).toBeNull();
  });
});

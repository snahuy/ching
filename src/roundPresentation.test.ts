import { describe, expect, it } from 'vitest';
import { battleAnnouncement, gameAnnouncement, revealedMoveLabel, soloAnnouncement } from './roundPresentation';
import { MOVE_LIST, resolveRound } from './rules';
import { resolveBattle } from './multiplayer/rules';
const name=(id:string)=>({a:'Dara',b:'Bot',c:'Malis'}[id]??id);
const players=['a','b','c'].map(id=>({id,ammo:5,active:true,eliminatedRound:null}));
describe('event-based round presentation',()=>{
  it('labels reload gains, familiar attacks, blocks and targets in both languages',()=>{
    expect(revealedMoveLabel('en','reload')).toBe('Reload (+1 ammo)');
    expect(revealedMoveLabel('km','reload')).toContain('គ្រាប់');
    expect(revealedMoveLabel('km','ching','Dara')).toBe('ឈីង → Dara');
    for(const m of MOVE_LIST)expect(revealedMoveLabel('en',m.id)).toContain(m.name);
  });
  it.each([['ching','block1','No winner','Ching was blocked.'],['ching','ching','No winner','Equal attacks canceled.'],['reload','reload','Both players reloaded.',''],['ching','reload','Dara wins!','Ching hit Bot while reloading.'],['ching','swing','Bot wins!','Swing beats Ching.']] as const)('announces %s/%s using resolved outcomes',(p,a,headline,detail)=>{
    const round=resolveRound(5,5,p,a);expect(soloAnnouncement('en',round,'Dara','Bot')).toEqual({headline,detail});
    const km=soloAnnouncement('km',round,'Dara','Bot');expect(km.headline+km.detail).toMatch(/[\u1780-\u17ff]/);
  });
  it('announces eliminated and remaining players without declaring a winner early',()=>{
    const r=resolveBattle(players,[{playerId:'a',move:'ching',targetId:'b'},{playerId:'b',move:'reload'},{playerId:'c',move:'block1'}],1);
    const result=battleAnnouncement('en',r,r.players.filter(p=>p.active).map(p=>p.id),name);
    expect(result).toEqual({headline:'Eliminated: Bot.',detail:'Remaining: Dara, Malis.'});expect(result.headline).not.toContain('wins');
  });
  it('declares a multiplayer draw when simultaneous attacks eliminate everyone',()=>{
    const r=resolveBattle(players,[{playerId:'a',move:'ching',targetId:'b'},{playerId:'b',move:'ching',targetId:'c'},{playerId:'c',move:'ching',targetId:'a'}],1);
    expect(battleAnnouncement('en',r,[],name)).toEqual({headline:'Draw — everyone eliminated.',detail:'Eliminated: Bot, Malis, Dara. Remaining: None.'});
  });
  it('announces a winner only for the last survivor and shows awarded game scores',()=>{
    const r=resolveBattle(players.slice(0,2),[{playerId:'a',move:'ching',targetId:'b'},{playerId:'b',move:'reload'}],1);
    expect(battleAnnouncement('en',r,['a'],name).headline).toBe('Dara wins!');
    expect(gameAnnouncement('en',3,'Dara','Dara 2, Bot 1')).toEqual({headline:'Game 3 winner: Dara!',detail:'Score: Dara 2, Bot 1.'});
    expect(gameAnnouncement('en',3,null,'Dara 2, Bot 1').headline).toBe('Game 3: draw — no points.');
  });
  it('does not confuse blocks and canceled reciprocal attacks with a winner',()=>{
    for(const moves of [['ching','block1'],['ching','ching']] as const){const r=resolveBattle(players.slice(0,2),[{playerId:'a',move:moves[0],targetId:'b'},{playerId:'b',move:moves[1],...(moves[1]==='ching'?{targetId:'a'}:{})}],1);expect(battleAnnouncement('en',r,['a','b'],name).headline).toBe('No winner');}
  });
});

import { MOVES, type MoveId, type Round } from './rules';
import { moveName, translate, type Language } from './i18n/core';
import type { AttackEvent, LockedAction } from './multiplayer/rules';
export type Announcement = { headline: string; detail: string };
export function revealedMoveLabel(language: Language, move: MoveId, target?: string) {
  const label = move === 'reload' ? translate(language, 'reveal.reload') : moveName(language, move);
  return target ? `${label} → ${target}` : label;
}
export function soloAnnouncement(language: Language, round: Round, player: string, bot: string): Announcement {
  const t = (key: string, params = {}) => translate(language, key, params);
  const p=MOVES[round.playerMove], a=MOVES[round.aiMove];
  const winner=round.outcome==='player'?player:bot;
  if(round.outcome==='player'||round.outcome==='ai') {
    const attack=round.outcome==='player'?p:a, defense=round.outcome==='player'?a:p;
    const target=round.outcome==='player'?bot:player;
    return {headline:t('announce.wins',{name:winner}),detail:t(defense.kind==='reload'?'announce.reloadHit':defense.kind==='attack'?'announce.stronger':'announce.breaksBlock',{move:moveName(language,attack.id),other:moveName(language,defense.id),target})};
  }
  if(round.outcome==='draw') return {headline:t('announce.equalDraw'),detail:t('announce.equal')};
  if(p.kind==='attack'||a.kind==='attack')return {headline:t('announce.noWinner'),detail:p.kind==='attack'&&a.kind==='attack'?t('announce.equal'):t('announce.blocked',{move:moveName(language,p.kind==='attack'?p.id:a.id)})};
  return {headline:p.kind==='reload'&&a.kind==='reload'?t('announce.bothReload'):t('announce.noWinner'),detail:p.kind==='reload'&&a.kind==='reload'?'':p.kind==='block'&&a.kind==='block'?t('announce.bothBlock'):t('announce.safeReload',{name:p.kind==='reload'?player:bot})};
}
export function battleAnnouncement(language: Language, round: {actions: LockedAction[]; events: AttackEvent[]; eliminated: string[]}, remaining: string[], name: (id: string)=>string): Announcement {
  const t=(key:string,params={})=>translate(language,key,params);
  const eliminated=round.eliminated.map(name).join(', '), survivors=remaining.map(name).join(', ');
  const detail=t('announce.roster',{eliminated:eliminated||t('None'),remaining:survivors||t('None')});
  if(!remaining.length)return {headline:t('announce.draw'),detail};
  if(remaining.length===1)return {headline:t('announce.wins',{name:name(remaining[0])}),detail};
  if(round.eliminated.length)return {headline:t('announce.eliminated',{names:eliminated}),detail:t('announce.remaining',{names:survivors})};
  const attacks=round.events;
  let outcome=round.actions.length&&round.actions.every(a=>a.move==='reload')?t(round.actions.length===2?'announce.bothReload':'Everyone reloaded'):attacks.some(a=>a.result==='blocked')?t('announce.blocked',{move:attacks.filter(a=>a.result==='blocked').map(a=>moveName(language,a.move)).filter((m,i,ms)=>ms.indexOf(m)===i).join(', ')}):attacks.some(a=>a.result==='canceled')?t('announce.equal'):t('announce.everyoneSafe');
  return {headline:attacks.length?t('announce.noWinner'):outcome,detail:(attacks.length?outcome+' ':'')+t('announce.remaining',{names:survivors})};
}
export function gameAnnouncement(language: Language, game: number, winner: string|null, scores: string): Announcement {
  return {headline:translate(language,winner?'announce.gameWinner':'announce.gameDraw',{game,name:winner??''}),detail:translate(language,'activity.scores',{scores})};
}

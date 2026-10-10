import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SoloGameResult } from './SoloGameResult';
import { LanguageProvider } from './i18n/react';
import { DEFAULT_PROFILE } from './avatars';
import { resolveRound } from './rules';
afterEach(()=>vi.unstubAllGlobals());
it.each(['player','ai','draw'] as const)('shows the actual %s game outcome, identity, explanation and awarded score',outcome=>{
  const round=outcome==='draw'?resolveRound(1,1,'ching','ching',{equalAttacks:'draw',blocksStopWeaker:false,spendFailedAttacks:true}):resolveRound(1,1,outcome==='player'?'ching':'reload',outcome==='ai'?'ching':'reload');
  const scores={player:outcome==='player'?1:0,ai:outcome==='ai'?1:0};
  const html=renderToStaticMarkup(<SoloGameResult round={round} game={3} name="Dara" profile={DEFAULT_PROFILE} botProfile={{avatarId:'bazooka',backgroundId:'mint'}} scores={scores}/>);
  expect(html).toContain(outcome==='player'?'You win!':outcome==='ai'?'Bot wins!':'Draw!');
  expect(html).toContain('Game 3');expect(html).toContain('Robot');expect(html).toContain(outcome==='player'?'sok.svg':'bazooka.svg');expect(html).toContain(outcome==='draw'?'Equal attacks canceled.':outcome==='player'?'Ching hit Robot while reloading.':'Ching hit Dara while reloading.');
  expect(html).toContain(`<b>${scores.player}</b>`);expect(html).toContain(`<b>${scores.ai}</b>`);
});
it('renders the winner announcement in Khmer without translating nicknames',()=>{
  vi.stubGlobal('localStorage',{getItem:()=> 'km'});
  const html=renderToStaticMarkup(<LanguageProvider><SoloGameResult round={resolveRound(1,0,'ching','reload')} game={2} name="Dara" profile={DEFAULT_PROFILE} botProfile={DEFAULT_PROFILE} scores={{player:1,ai:0}}/></LanguageProvider>);
  expect(html).toContain('អ្នកឈ្នះ!');expect(html).toContain('Dara');expect(html).toContain('ឈីង');expect(html).toContain('ល្បែងទី 2');
});

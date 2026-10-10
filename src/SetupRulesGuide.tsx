import { BattleSheet } from './BattleUI';
import { Gesture } from './Gesture';
import { useLanguage } from './i18n/react';
export function SetupRulesGuide({onClose}:{onClose:()=>void}){
  const {t}=useLanguage();
  return <BattleSheet title={t('How to play')} onClose={onClose}>
    <div className="setup-quick-rules"><section><div><h3>{t('Bot difficulty')}</h3><p>{t('easy')}: {t('Mostly random legal moves.')}</p><p>{t('normal')}: {t('Balances reloading, attacks, and blocks using both ammo counts.')}</p><p>{t('hard')}: {t('Uses recent rounds and your move habits, with unpredictable choices.')}</p></div></section>
      <section><Gesture move="reload" icon/><div><h3>{t('Reload short')}</h3><p>{t('Start with 0 ammo. Reload adds 1 ammo, kept between rounds.')}</p></div></section>
      <section><Gesture move="block1" icon/><div><h3>{t('Defend')}</h3><p>{t('Blocks are free. Block 1 stops Ching and Swing; Block 2 stops Klarteang; Block 3 stops Seuteang.')}</p></div></section>
      <section><Gesture move="ching" icon/><div><h3>{t('Ching')}</h3><p>{t('Ching costs 1 ammo. Attack a reloading opponent or beat their block to win the game. Stronger attacks beat weaker attacks.')}</p></div></section>
      <section><div className="setup-win-mark" aria-hidden="true">✓</div><div><h3>{t('How to win')}</h3><p>{t('Choose secretly, then reveal together. Each game win earns 1 point. Reach the match target to win the match.')}</p></div></section>
    </div>
    <p>{t('Time runs out? Your move locks automatically as Block 1. The timer pauses during animations. Each game winner earns 1 point; draws earn none.')}</p>
    <p>{t('Ching is a Cambodian schoolyard hand game. Local rules may vary; this version follows the rules supplied for this game.')}</p>
  </BattleSheet>;
}

import { Avatar } from './Avatar';
import { avatarById, type AvatarProfile } from './avatars';
import type { Round } from './rules';
import { useLanguage } from './i18n/react';
import { soloAnnouncement } from './roundPresentation';
export function SoloGameResult({ round, game, name, profile, botProfile, scores }: {round:Round;game:number;name:string;profile:AvatarProfile;botProfile:AvatarProfile;scores:Record<string,number>}) {
  const {t,language}=useLanguage();
  const draw=round.outcome==='draw', player=round.outcome==='player';
  const botName=avatarById(botProfile.avatarId).name;
  const explanation=soloAnnouncement(language,round,name,botName).detail;
  return <div className="solo-result-overlay" role="status" aria-live="polite"><div className="solo-result-card"><span className="solo-result-game">{t('Game {game}',{game})}</span><h2>{t(draw?'Draw!':player?'You win!':'Bot wins!')}</h2><div className="solo-result-identity">{draw?<><Avatar profile={profile} size={40} decorative/><Avatar profile={botProfile} size={40} decorative/></>:<Avatar profile={player?profile:botProfile} size={44} decorative/>}<strong>{draw?`${name} · ${botName}`:player?name:botName}</strong></div><p>{explanation}</p><div className="solo-result-score" aria-label={t('Match scoreboard')}><span>{name}<b>{scores.player}</b></span><span>{botName}<b>{scores.ai}</b></span></div></div></div>;
}

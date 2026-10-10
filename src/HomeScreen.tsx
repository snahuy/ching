import { CURRENT_HOME_SCENERY } from './homeScenery';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useLanguage } from './i18n/react';
import { APP_VERSION } from './appInfo';
import { Character } from './Character';
import { useAppPreferences } from './AppPreferencesContext';
import type { CharacterState } from './characterState';
import { AVATARS, avatarById, type AvatarId } from './avatars';

// Real text shares the page-title typography; artwork contains no UI labels.
export function ChingWordmark(){const {language}=useLanguage();return <span className="ching-wordmark page-title" aria-hidden="true">{language === 'km' ? 'ឈីង' : 'CHING'}</span>;}

// Every existing avatar gets a turn, paired with a different character.
// Shared poses and casual outfits preserve the home artwork's proportions.
const HOME_POSES: readonly [CharacterState,CharacterState][] = [
  ['idle','idle'], ['reload','reload'], ['ching','block1'],
  ['block2','klarteang'], ['swing','block1'], ['block3','seuteang'],
];
const HOME_SCENES: readonly {characters:[AvatarId,AvatarId]; poses:[CharacterState,CharacterState]}[] = AVATARS.map((avatar,index)=>({
  characters:[avatar.id,AVATARS[(index+17)%AVATARS.length].id],
  poses:HOME_POSES[index%HOME_POSES.length],
}));
function HomeArtwork(){
  const {t}=useLanguage(); const {preferences}=useAppPreferences();
  const [scene,setScene]=useState(0);
  const [ready,setReady]=useState(false);
  const [visible,setVisible]=useState(()=>!document.hidden);
  const [busy,setBusy]=useState(false);
  const [gesture,setGesture]=useState<{side:number;move:'reload'|'ching'|'block1';serial:number}|null>(null);
  const locked=useRef(false), fadeUntil=useRef(0), serial=useRef(0);
  const interactionTimers=useRef<number[]>([]);
  const audio=useRef<AudioContext|null>(null);
  const currentPreferences=useRef(preferences);currentPreferences.current=preferences;
  useEffect(()=>()=>{interactionTimers.current.forEach(window.clearTimeout);void audio.current?.close();},[]);
  function tapCharacter(side:number){
    if(locked.current||!visible)return;
    locked.current=true;setBusy(true);
    const move='ching' as const;
    if(!preferences.muted){try{audio.current??=new AudioContext();void audio.current.resume().catch(()=>{});}catch{/* Optional audio may be unavailable. */}}
    // Finish the current crossfade before changing a pose; never animate two layers.
    const delay=preferences.reduced?0:Math.max(0,fadeUntil.current-Date.now());
    interactionTimers.current.push(window.setTimeout(()=>{
      if(document.hidden){locked.current=false;setBusy(false);return;}
      setGesture({side,move,serial:++serial.current});
      if(!currentPreferences.current.muted&&audio.current){
        const context=audio.current, start=context.currentTime;
        const oscillator=context.createOscillator(), gain=context.createGain();
        oscillator.type='triangle';
        oscillator.frequency.setValueAtTime(850,start);
        oscillator.frequency.exponentialRampToValueAtTime(170,start+.14);
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.07,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+.17);
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.18);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
      interactionTimers.current.push(window.setTimeout(()=>{setGesture(null);locked.current=false;setBusy(false);interactionTimers.current=[];},850));
    },delay));
  }
  useEffect(()=>{
    let active=true;
    const ids=[...new Set(HOME_SCENES.flatMap(s=>s.characters))];
    const sources=[...ids.map(id=>`${import.meta.env.BASE_URL}characters/heads/${id}.svg`),`${import.meta.env.BASE_URL}${CURRENT_HOME_SCENERY.image}`];
    Promise.all(sources.map(src=>new Promise<void>(resolve=>{
      const image=new Image();
      // A slow decode must not leave the artwork cycle permanently gated.
      const timeout=window.setTimeout(resolve,2500);
      const finish=()=>{window.clearTimeout(timeout);resolve();};
      image.onload=()=>{image.decode().catch(()=>{}).then(finish);};
      image.onerror=finish;image.src=src;
    }))).then(()=>{if(active)setReady(true);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    const changed=()=>setVisible(!document.hidden);
    document.addEventListener('visibilitychange',changed);
    return()=>document.removeEventListener('visibilitychange',changed);
  },[]);
  useEffect(()=>{
    if(preferences.reduced||!ready||!visible||busy)return;
    const timer=window.setTimeout(()=>{
      // Choose any other scene; consecutive duplicates are impossible.
      const next=Math.floor(Math.random()*(HOME_SCENES.length-1));
      fadeUntil.current=Date.now()+600;
      setScene(next>=scene?next+1:next);
    },5000);
    return()=>window.clearTimeout(timer);
  },[preferences.reduced,ready,visible,busy,scene]);
  const selected=preferences.reduced?0:scene;
  return <div className="home-character-scene" role="group" aria-label={t('home.artDescription')} data-gesture-side={gesture?.side}>
    <img className="home-monument" src={`${import.meta.env.BASE_URL}${CURRENT_HOME_SCENERY.image}`} alt="" aria-hidden="true" fetchPriority="high"/>
    {HOME_SCENES.map((illustration,index)=><div key={index} className={`home-scene-layer ${selected===index?'is-current':''}`} aria-hidden={selected!==index} data-scene={index}>
      {illustration.characters.map((avatarId,side)=><div className="home-playmate" key={side}><Character profile={{avatarId,backgroundId:'lavender'}} state={selected===index&&gesture?.side===side?gesture.move:illustration.poses[side]} facing={side===0?'right':'left'} reduced={preferences.reduced||!visible} casual cycle={selected===index&&gesture?.side===side?`tap-${gesture.serial}`:`home-${selected===index?scene:'hidden'}`}/></div>)}
    </div>)}
    {HOME_SCENES[selected].characters.map((avatarId,side)=><button key={side} type="button" className={`home-character-tap home-character-tap-${side}`} aria-label={t('home.tapCharacter',{name:avatarById(avatarId).name})} aria-disabled={busy} onClick={()=>tapCharacter(side)}/>)}
  </div>;
}
function Arrow(){return <svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16h24M20 7l9 9-9 9"/></svg>;}
function SinglePlayerIcon(){return <svg aria-hidden="true" viewBox="0 0 40 40" width="38" height="38" fill="currentColor"><circle cx="20" cy="10" r="7"/><path d="M7 33c0-8 5-13 13-13s13 5 13 13v3H7Z"/></svg>;}
function Friends(){return <svg aria-hidden="true" viewBox="0 0 40 40" width="38" height="38" fill="currentColor"><circle cx="12" cy="10" r="6"/><circle cx="29" cy="11" r="5.5"/><path d="M1 33c0-8 4-13 11-13s11 5 11 13v3H1Zm24 3v-3c0-5-1-9-4-12 2-1 4-1 8-1 6 0 10 5 10 13v3Z"/></svg>;}
function Book(){return <svg aria-hidden="true" viewBox="0 0 32 32" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><path d="M16 7c-5-3-9-3-14-1v22c5-2 9-2 14 1 5-3 9-3 14-1V6c-5-2-9-2-14 1Zm0 0v22"/></svg>;}
export function HomeScreen({onSingle,onMulti,onHelp,helpButton}:{onSingle:()=>void;onMulti:()=>void;onHelp:()=>void;helpButton:RefObject<HTMLButtonElement|null>}){
  const {t}=useLanguage();const probe=useRef<HTMLSpanElement>(null);const [largeText,setLargeText]=useState(false);
  useEffect(()=>{const observer=new ResizeObserver(()=>setLargeText((probe.current?.getBoundingClientRect().width??16)>18));if(probe.current)observer.observe(probe.current);return()=>observer.disconnect();},[]);
  return <section className={`mobile-home designed-home ${largeText?'home-large-text':''}`}><span className="home-font-probe" ref={probe} aria-hidden="true"/><div className="home-intro"><p className="home-kicker">{t('home.classic')}</p><h1><span>{t('home.ready')}</span><span className="home-ching-line">{t('home.ching')}</span></h1><p className="home-description">{t('home.nostalgia')}</p></div><div className="home-stage"><HomeArtwork/><p className="home-landmark-caption"><strong>{t(CURRENT_HOME_SCENERY.landmark)}</strong><span>{t(CURRENT_HOME_SCENERY.location)}</span></p></div><div className="home-modes"><button className="mode-button primary-mode" onClick={onSingle}><span className="mode-icon" aria-hidden="true"><SinglePlayerIcon/></span><span className="mode-copy"><strong>{t('Single Player')}</strong><span>{t('home.challenge')}</span></span><Arrow/></button><button className="mode-button secondary-mode" onClick={onMulti}><span className="mode-icon"><Friends/></span><span className="mode-copy"><strong>{t('Multiplayer')}</strong><span>{t('Play with friends')}</span></span><Arrow/></button></div><div className="home-tools"><button ref={helpButton} className="text-control" onClick={onHelp}><Book/>{t('How to play')}</button></div><footer className="home-footer"><span>{t('home.memories')}</span><span aria-label={t('Ching — Version {version}',{version:APP_VERSION})}>{t('home.version',{version:APP_VERSION})}</span></footer></section>;
}

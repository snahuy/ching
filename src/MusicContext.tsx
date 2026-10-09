import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useAppPreferences} from './AppPreferencesContext';
import {MusicPlayer} from './music';
const Context=createContext({previewing:false,togglePreview:()=>{},stopPreview:()=>{}});
export function MusicProvider({children}:{children:ReactNode}){
  const {preferences}=useAppPreferences();const player=useRef(new MusicPlayer());
  const [previewing,setPreviewing]=useState(false);const previewTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function stopPreview(){if(previewTimer.current)clearTimeout(previewTimer.current);previewTimer.current=null;setPreviewing(false);player.current.setPreview(false);}
  useEffect(()=>{player.current.setPreferences(preferences.musicEnabled,preferences.musicVolume);},[preferences.musicEnabled,preferences.musicVolume]);
  useEffect(()=>{
    const unlock=()=>player.current.unlock();const visibility=()=>{if(document.hidden)stopPreview();player.current.setVisible(!document.hidden);};
    player.current.setVisible(!document.hidden);document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);document.addEventListener('visibilitychange',visibility);
    return()=>{document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',visibility);if(previewTimer.current)clearTimeout(previewTimer.current);player.current.dispose();};
  },[]);
  function togglePreview(){if(previewing){stopPreview();return;}setPreviewing(true);player.current.setPreview(true);previewTimer.current=setTimeout(stopPreview,12000);}
  return <Context.Provider value={{previewing,togglePreview,stopPreview}}>{children}</Context.Provider>;
}
export const useMusic=()=>useContext(Context);

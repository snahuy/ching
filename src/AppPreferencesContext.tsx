import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { readAppPreferences, saveAppPreferences, type AppPreferences } from './appPreferences';
const PreferencesContext=createContext<{preferences:AppPreferences;update:<K extends keyof AppPreferences>(key:K,value:AppPreferences[K])=>void}>({preferences:{muted:true,reduced:false,reactionMuted:false,musicEnabled:false,musicVolume:.25},update:()=>{}});
export function AppPreferencesProvider({children}:{children:ReactNode}){
  const [preferences,setPreferences]=useState(()=>{try{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;return {...readAppPreferences(localStorage,reduced),reduced};}catch{return {muted:true,reduced:false,reactionMuted:false,musicEnabled:false,musicVolume:.25};}});
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setPreferences(p=>({...p,reduced:query.matches}));query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed);},[]);
  useEffect(()=>{try{saveAppPreferences(localStorage,preferences);}catch{/* Storage may be unavailable. */}},[preferences]);
  return <PreferencesContext.Provider value={{preferences,update:(key,value)=>setPreferences(p=>({...p,[key]:value}))}}>{children}</PreferencesContext.Provider>;
}
export const useAppPreferences=()=>useContext(PreferencesContext);

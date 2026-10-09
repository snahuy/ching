import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { readAppPreferences, saveAppPreferences, type AppPreferences } from './appPreferences';
const PreferencesContext=createContext<{preferences:AppPreferences;update:(key:keyof AppPreferences,value:boolean)=>void}>({preferences:{muted:true,reduced:false,reactionMuted:false},update:()=>{}});
export function AppPreferencesProvider({children}:{children:ReactNode}){
  const [preferences,setPreferences]=useState(()=>{try{return readAppPreferences(localStorage,matchMedia('(prefers-reduced-motion: reduce)').matches);}catch{return {muted:true,reduced:false,reactionMuted:false};}});
  useEffect(()=>{try{saveAppPreferences(localStorage,preferences);}catch{/* Storage may be unavailable. */}},[preferences]);
  return <PreferencesContext.Provider value={{preferences,update:(key,value)=>setPreferences(p=>({...p,[key]:value}))}}>{children}</PreferencesContext.Provider>;
}
export const useAppPreferences=()=>useContext(PreferencesContext);

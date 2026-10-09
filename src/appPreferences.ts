export type AppPreferences = { muted:boolean; reduced:boolean; reactionMuted:boolean; musicEnabled:boolean; musicVolume:number };
export const APP_PREFERENCES_KEY='ching.app-preferences.v1';
export function readAppPreferences(storage:Pick<Storage,'getItem'>, reducedDefault=false):AppPreferences {
  const defaults={muted:true,reduced:reducedDefault,reactionMuted:false,musicEnabled:false,musicVolume:.25};
  try {const value=JSON.parse(storage.getItem(APP_PREFERENCES_KEY)??'null');return {muted:typeof value?.muted==='boolean'?value.muted:defaults.muted,reduced:typeof value?.reduced==='boolean'?value.reduced:defaults.reduced,reactionMuted:typeof value?.reactionMuted==='boolean'?value.reactionMuted:storage.getItem('ching.reaction-mute')==='true',musicEnabled:typeof value?.musicEnabled==='boolean'?value.musicEnabled:false,musicVolume:typeof value?.musicVolume==='number'&&Number.isFinite(value.musicVolume)?Math.max(0,Math.min(1,value.musicVolume)):.25};}catch{return defaults;}
}
export function saveAppPreferences(storage:Pick<Storage,'setItem'>, value:AppPreferences){try{storage.setItem(APP_PREFERENCES_KEY,JSON.stringify(value));}catch{/* Preferences still apply in this session. */}}
export function pauseMoveDeadline(deadline:number,now=Date.now()){return Math.max(0,deadline-now);}
export function resumeMoveDeadline(remaining:number,now=Date.now()){return now+Math.max(0,remaining);}

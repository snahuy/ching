import { expect, it } from 'vitest';
import { APP_PREFERENCES_KEY, readAppPreferences, saveAppPreferences, pauseMoveDeadline, resumeMoveDeadline } from './appPreferences';
import { APP_VERSION } from './appInfo';
import metadata from '../package.json';
it('persists all preferences and preserves explicit reduced motion over OS defaults',()=>{
  const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)}};
  expect(readAppPreferences(storage,true)).toEqual({muted:true,reduced:true,reactionMuted:false,musicEnabled:false,musicVolume:.25});
  const preferences={muted:false,reduced:false,reactionMuted:true,musicEnabled:true,musicVolume:.4};saveAppPreferences(storage,preferences);expect(readAppPreferences(storage,true)).toEqual(preferences);expect(values.has(APP_PREFERENCES_KEY)).toBe(true);
});
it('migrates the old reaction preference and handles corrupt/unavailable storage',()=>{
  expect(readAppPreferences({getItem:key=>key==='ching.reaction-mute'?'true':null}).reactionMuted).toBe(true);
  expect(readAppPreferences({getItem:()=>'{invalid'},true)).toEqual({muted:true,reduced:true,reactionMuted:false,musicEnabled:false,musicVolume:.25});
  expect(readAppPreferences({getItem:()=>{throw Error()}})).toEqual({muted:true,reduced:false,reactionMuted:false,musicEnabled:false,musicVolume:.25});
  expect(()=>saveAppPreferences({setItem:()=>{throw Error()}},{muted:true,reduced:false,reactionMuted:false,musicEnabled:false,musicVolume:.25})).not.toThrow();
});
it('resumes the exact remaining move time rather than resetting or spending settings time',()=>{
  const remaining=pauseMoveDeadline(10000,2500);expect(remaining).toBe(7500);expect(resumeMoveDeadline(remaining,60000)).toBe(67500);
  expect(pauseMoveDeadline(10000,10001)).toBe(0);expect(resumeMoveDeadline(0,60000)).toBe(60000);
});
it('uses package metadata as the one version source',()=>{expect(APP_VERSION).toBe(metadata.version);expect(APP_VERSION).toBe('1.0.2');});

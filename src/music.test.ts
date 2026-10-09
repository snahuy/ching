import {afterEach,expect,it,vi} from 'vitest';
import {composeMusic,MusicPlayer} from './music';
import {readAppPreferences,APP_PREFERENCES_KEY} from './appPreferences';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('composes a deterministic, quiet, seamless original instrumental loop',()=>{
  const samples=composeMusic(8000), repeat=composeMusic(8000);
  expect(samples).toEqual(repeat);expect(samples.length/8000).toBeCloseTo(32*60/88,3);
  expect(samples.every(Number.isFinite)).toBe(true);
  let peak=0,power=0;for(const s of samples){peak=Math.max(peak,Math.abs(s));power+=s*s;}
  expect(peak).toBeLessThan(.3);expect(Math.sqrt(power/samples.length)).toBeGreaterThan(.01);
  expect(Math.abs(samples[0]-samples.at(-1)!)).toBeLessThan(.02);
});
it('migrates music defaults and clamps persisted volume independently of sound effects',()=>{
  const storage=(value:unknown)=>({getItem:(key:string)=>key===APP_PREFERENCES_KEY?JSON.stringify(value):null});
  expect(readAppPreferences(storage({muted:false}))).toMatchObject({muted:false,musicEnabled:false,musicVolume:.25});
  expect(readAppPreferences(storage({muted:true,musicEnabled:true,musicVolume:7}))).toMatchObject({muted:true,musicEnabled:true,musicVolume:1});
  expect(readAppPreferences(storage({musicVolume:-2})).musicVolume).toBe(0);
});
it('requires interaction, fades volume, avoids duplicate sources, and pauses/resumes at the saved position',async()=>{
  vi.useFakeTimers();let starts=0,stops=0;const offsets:number[]=[];const targets:number[]=[];
  const gain={gain:{value:0,cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),linearRampToValueAtTime:(value:number)=>targets.push(value)},connect:vi.fn()};
  class FakeAudio{
    currentTime=0;sampleRate=8000;state='running';destination={};
    createGain(){return gain;}
    createBuffer(_channels:number,length:number,rate:number){return{duration:length/rate,copyToChannel:vi.fn()};}
    createBufferSource(){return{buffer:null,loop:false,connect:vi.fn(),disconnect:vi.fn(),start:(_when:number,offset:number)=>{starts++;offsets.push(offset);},stop:()=>{stops++;}};}
    async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
  }
  vi.stubGlobal('AudioContext',FakeAudio);const player=new MusicPlayer();
  player.setPreferences(true,.25);expect(starts).toBe(0);
  player.unlock();await Promise.resolve();expect(starts).toBe(1);
  player.setPreferences(true,.5);player.unlock();await Promise.resolve();expect(starts).toBe(1);expect(targets.at(-1)).toBeCloseTo(.275);
  player.setVisible(false);expect(stops).toBe(1);player.setVisible(true);await Promise.resolve();expect(starts).toBe(2);
  player.setPreferences(false,.5);expect(targets.at(-1)).toBe(0);vi.advanceTimersByTime(331);expect(stops).toBe(2);
  player.setVisible(false);player.setVisible(true);expect(starts).toBe(2);
  player.setPreview(true);await Promise.resolve();expect(starts).toBe(3);player.setPreview(false);vi.advanceTimersByTime(331);expect(stops).toBe(3);
  expect(offsets.every(Number.isFinite)).toBe(true);player.dispose();
});

// Original composition: "Schoolyard Afternoon". No samples or external audio.
// Soft, decaying wooden-bar partials evoke roneat; restrained drum/brush accents.
export function composeMusic(sampleRate:number){
  const beat=60/88, duration=32*beat, samples=new Float32Array(Math.round(duration*sampleRate));
  const scale=[293.665,349.228,391.995,440,523.251,587.33];
  const melody=[0,2,3,2,1,0,2,4,3,2,1,2,0,1,2,3,4,3,2,0,1,2,3,2,0,2,1,0,2,3,1,0];
  function wood(at:number,pitch:number,level:number){
    const start=Math.round(at*sampleRate);
    for(let i=0;i<sampleRate*1.5;i++){
      const t=i/sampleRate,attack=Math.min(1,t/.009);
      const tone=Math.sin(2*Math.PI*pitch*t)*Math.exp(-t*4.2)+.28*Math.sin(2*Math.PI*pitch*2.76*t)*Math.exp(-t*12)+.12*Math.sin(2*Math.PI*pitch*5.4*t)*Math.exp(-t*24);
      samples[(start+i)%samples.length]+=level*attack*tone;
    }
  }
  let seed=9137;
  function drum(at:number,soft:boolean){
    const start=Math.round(at*sampleRate);
    for(let i=0;i<sampleRate*.14;i++){
      const t=i/sampleRate;seed=(seed*1664525+1013904223)>>>0;
      const noise=(seed/4294967296*2-1);
      const value=soft?noise*.018*Math.exp(-t*55):(.032*Math.sin(2*Math.PI*(110*t-75*t*t))+noise*.008)*Math.exp(-t*32);
      samples[(start+i)%samples.length]+=Math.min(1,t/.004)*value;
    }
  }
  melody.forEach((note,i)=>{wood(i*beat,scale[note],i%4===0?.12:.09);if(i%4===0)wood(i*beat,scale[0]/2,.025);if(i%2===0)drum(i*beat,false);drum((i+.62)*beat,true);});
  return samples;
}

export class MusicPlayer{
  private context:AudioContext|null=null;
  private gain:GainNode|null=null;
  private buffer:AudioBuffer|null=null;
  private source:AudioBufferSourceNode|null=null;
  private stopTimer:ReturnType<typeof setTimeout>|null=null;
  private offset=0;private started=0;
  private unlocked=false;private enabled=false;private preview=false;private visible=true;private volume=.25;
  setPreferences(enabled:boolean,volume:number){this.enabled=enabled;this.volume=Math.max(0,Math.min(1,volume));this.sync();}
  setVisible(visible:boolean){this.visible=visible;if(!visible){this.preview=false;this.stop();void this.context?.suspend();}else this.sync();}
  setPreview(preview:boolean){this.preview=preview;this.unlock();this.sync();}
  unlock(){this.unlocked=true;if(this.visible&&(this.enabled||this.preview)){this.ensure();void this.context?.resume().then(()=>this.sync()).catch(()=>{});}}
  private ensure(){if(this.context)return;try{this.context=new AudioContext();this.gain=this.context.createGain();this.gain.gain.value=0;this.gain.connect(this.context.destination);}catch{/* Optional music remains silent on unsupported devices. */}}
  private ramp(value:number){if(!this.context||!this.gain)return;const now=this.context.currentTime;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setValueAtTime(this.gain.gain.value,now);this.gain.gain.linearRampToValueAtTime(value,now+.3);}
  private sync(){
    if(!this.visible||!this.unlocked||(!this.enabled&&!this.preview)){this.ramp(0);if(this.source&&!this.stopTimer)this.stopTimer=setTimeout(()=>this.stop(),330);return;}
    this.ensure();if(!this.context||!this.gain)return;
    if(this.context.state==='suspended'){void this.context.resume().then(()=>{if(this.context?.state==='running')this.sync();}).catch(()=>{});return;}
    if(this.stopTimer){clearTimeout(this.stopTimer);this.stopTimer=null;}
    if(!this.buffer){const pcm=composeMusic(this.context.sampleRate);this.buffer=this.context.createBuffer(1,pcm.length,this.context.sampleRate);this.buffer.copyToChannel(pcm,0);}
    if(!this.source){this.source=this.context.createBufferSource();this.source.buffer=this.buffer;this.source.loop=true;this.source.connect(this.gain);this.started=this.context.currentTime;this.source.start(0,this.offset%this.buffer.duration);}
    this.ramp(this.volume*.55);
  }
  private stop(){if(this.stopTimer){clearTimeout(this.stopTimer);this.stopTimer=null;}if(this.source&&this.context){this.offset+=(this.context.currentTime-this.started);this.source.stop();this.source.disconnect();this.source=null;}if(this.gain)this.gain.gain.value=0;}
  dispose(){this.stop();void this.context?.close();this.context=null;this.gain=null;this.buffer=null;}
}

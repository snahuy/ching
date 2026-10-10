import { useEffect, useState } from 'react';
import { BattleSheet } from './BattleUI';
import { MatchOptions } from './MatchOptions';
import { useLanguage } from './i18n/react';
import type { MatchSettings } from './match';

export function SetupMatchSettings({value,onChange,onValidity,onHelp}:{value:MatchSettings;onChange:(value:MatchSettings)=>void;onValidity:(valid:boolean)=>void;onHelp:()=>void}) {
 const {t}=useLanguage();
 const [compact,setCompact]=useState(()=>matchMedia('(min-width:700px) and (max-height:600px)').matches);
 const [open,setOpen]=useState(false);
 useEffect(()=>{const query=matchMedia('(min-width:700px) and (max-height:600px)');const update=()=>setCompact(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 function close(){setOpen(false);onValidity(true);}
 const options=<MatchOptions value={value} onChange={onChange} onValidity={onValidity} onHelp={onHelp} showDisabledCustom hideRules/>;
 return <>{compact ? <div className="setup-secondary-actions"><button type="button" className="setup-settings-trigger" onClick={()=>setOpen(true)} aria-haspopup="dialog"><strong>{t('Match settings')}</strong><span>{t('{count} seconds',{count:value.roundSeconds})} · {t('First to {target} wins',{target:value.winsRequired})}</span></button><button type="button" className="setup-rules-link text-control" onClick={onHelp}>{t('How to play')}</button></div> : options}{open && <BattleSheet title={t('Match settings')} onClose={close}>{options}</BattleSheet>}</>;
}

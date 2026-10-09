import { useLanguage } from './i18n/react';
import { useId, type CSSProperties } from 'react';
import { avatarById, type AvatarProfile, type AvatarId } from './avatars';
import { CHARACTER_DESIGNS } from './characterDesigns';
import { STATE_LABELS, ROUND_TIMING, type CharacterState } from './characterState';
import type { MoveId } from './rules';

type Pose = [number, number, number, number];
// Shoulder and elbow rotations (degrees). Upper/lower limb lengths are
// always 36/42 units. The opponent mirrors the entire same rig.
const POSES: Record<Exclude<CharacterState, 'blocked'>, Pose> = {
  idle: [-20, -65, -25, -45], clap: [-53, -70, 53, 70],
  reload: [65, 115, -65, -115],
  ching: [-45, -25, -35, -15], swing: [30, 25, 35, 25],
  klarteang: [-45, -25, -35, -15], seuteang: [-100, -15, -130, 140],
  block1: [-40, -110, 40, 110], block2: [65, 115, -65, -115], block3: [30, -110, -30, 110],
  hit: [70, 35, -80, -25], victory: [140, 15, -140, -15], defeat: [10, 5, -10, -5],
};
// A clap brings the palms together at chest level. Inverse kinematics keeps
// both arms the same length instead of stretching different cosmetics.
function toward(shoulderX: number, wristX: number, wristY: number, branch: number): [number, number] {
  const dx = wristX - shoulderX, dy = wristY - 117, distance = Math.hypot(dx, dy);
  const a = (36 * 36 - 42 * 42 + distance * distance) / (2 * distance);
  const h = Math.sqrt(Math.max(0, 36 * 36 - a * a));
  const elbowX = shoulderX + a * dx / distance - branch * h * dy / distance;
  const elbowY = 117 + a * dy / distance + branch * h * dx / distance;
  const upper = -Math.atan2(elbowX - shoulderX, elbowY - 117) * 180 / Math.PI;
  const lower = -Math.atan2(wristX - elbowX, wristY - elbowY) * 180 / Math.PI - upper;
  return [upper, lower];
}
POSES.clap = [...toward(75, 106, 145, 1), ...toward(145, 114, 145, -1)];
const WINDUP: Partial<Record<CharacterState, Pose>> = {
  ching: [-95, -35, -60, -90], swing: [95, 35, 95, 35],
  klarteang: [-95, -35, -60, -90], seuteang: [-25, -45, 35, 50],
  reload: [25, -45, -25, 45], block1: [30, -20, -30, 20], block2: [25, -45, -25, 45], block3: [50, -30, -50, 30],
};
type Vars = CSSProperties & Record<`--${string}`, string>;

function Outfit({ id }: { id: AvatarId }) {
  const d = CHARACTER_DESIGNS[id];
  return <g className="character-outfit" fill={d.accent}>
    {id === 'student' && <><path d="M87 110 L110 134 L133 110 L124 142 H96 Z" fill="#e9edf4"/><path d="M110 134 V186" fill="none"/><rect x="119" y="139" width="15" height="12" rx="2"/></>}
    {id === 'dancer' && <><path d="M78 118 L140 106 L145 126 L81 143 Z"/><path d="M74 187 H146 L158 239 Q110 255 62 239 Z" fill={d.shirt}/><path d="M62 235 Q110 251 158 235 L158 245 Q110 261 62 245 Z"/><path d="M83 201 L88 233 M110 202 V242 M137 201 L132 233" fill="none" stroke="#f4c65d"/></>}
    {id === 'bokator' && <><path d="M88 106 L110 148 L132 106 L139 174 H81 Z" fill="#f4d9b0"/><path d="M74 168 H146 V181 H74 Z M132 181 L141 213 L129 214 L122 181 Z"/></>}
    {id === 'guardian' && <><path d="M87 111 L110 137 L133 111 L127 147 H93 Z"/><path d="M81 158 H139 M77 178 H143" fill="none"/><rect x="102" y="159" width="16" height="16" rx="4"/><path d="M81 208 H99 M121 208 H139" fill="none"/></>}
    {['tiger', 'monkey', 'dragon', 'gecko'].includes(id) && <ellipse cx="110" cy="152" rx="24" ry="36"/>}
    {id === 'tiger' && <g fill="#302e46"><path d="M78 125 L92 133 L77 139 M142 125 L128 133 L143 139 M75 159 L88 164 L74 170 M145 159 L132 164 L146 170 M83 218 L98 223 L83 228 M123 218 L138 223 L123 228"/></g>}
    {id === 'elephant' && <><path d="M89 108 V181 M131 108 V181" fill="none"/><circle cx="110" cy="147" r="5"/><circle cx="110" cy="167" r="5"/></>}
    {d.type === 'robot' && <><rect x="89" y="123" width="42" height="41" rx="8" fill="#c0dbe0"/><rect x="99" y="134" width="22" height="15" rx="4"/><path d="M84 180 H136 M83 225 H101 M119 225 H137" fill="none"/></>}
    {id === 'astronaut' && <><rect x="91" y="125" width="38" height="30" rx="5"/><circle cx="102" cy="139" r="4" fill="#81cbb6"/><path d="M116 135 V144" fill="none"/><path d="M73 175 H147 V185 H73 Z M82 222 H103 V232 H82 Z M117 222 H138 V232 H117 Z"/></>}
    {id === 'ninja' && <><path d="M88 107 L125 163 M132 107 L96 163" fill="none" stroke="#665c89" strokeWidth="8"/><path d="M73 172 H147 V185 H73 Z M137 181 L158 209 L147 216 L125 183 Z"/></>}
    {id === 'pirate' && <><path d="M94 107 L99 170 H121 L126 107" fill="#fff4dc"/><path d="M99 135 H121 M99 147 H121 M99 159 H121" fill="none"/><path d="M73 175 H147 V188 H73 Z" fill="#784b3b"/><rect x="104" y="174" width="15" height="15" rx="3" fill="#f4c65d"/></>}
    {id === 'phoenix' && <><path d="M85 118 L110 137 L135 118 L130 169 L110 192 L90 169 Z"/><path d="M74 185 L84 204 L98 196 L110 215 L122 196 L136 204 L146 185" fill={d.shirt}/><path d="M94 150 L110 161 L126 150 M97 169 L110 180 L123 169" fill="none"/></>}
    {id === 'wizard' && <><path d="M78 157 L66 239 Q110 250 154 239 L142 157" fill={d.shirt}/><path d="M67 235 Q110 247 153 235" fill="none" stroke={d.accent} strokeWidth="5"/><path d="M90 145 L94 154 L104 155 L97 162 L99 172 L90 167 L81 172 L83 162 L76 155 L86 154 Z M125 194 L129 201 L137 202 L131 209 L132 217 L125 213 L118 217 L119 209 L113 202 L121 201 Z"/></>}
    {id === 'spirit' && <><path d="M76 171 L63 220 L77 233 L90 221 L110 240 L128 220 L143 233 L157 220 L144 171" fill={d.shirt}/><path d="M90 107 L110 128 L130 107 L126 139 L110 146 L94 139 Z"/><path d="M84 177 Q110 198 136 177" fill="none" stroke="#81b879" strokeWidth="6"/></>}
    {id === 'gamer' && <><path d="M88 109 L100 125 L110 131 L120 125 L132 109 M99 125 V145 M121 125 V145" fill="none" stroke="#81cbb6"/><path d="M88 165 H132 L136 183 H84 Z" fill="#8062cc"/></>}
    {id === 'runner' && <><path d="M88 107 L95 151 M132 107 L125 151" fill="none" stroke="#fff4dc" strokeWidth="6"/><rect x="98" y="144" width="24" height="17" rx="3"/><path d="M71 188 H149 L144 219 H116 V199 H104 V219 H76 Z" fill={d.pants}/></>}
    {id === 'chef' && <><path d="M89 106 L110 126 L131 106 L121 140 H99 Z"/><path d="M90 144 H130 L137 193 H83 Z" fill="#fefaf0"/><path d="M110 143 V188" fill="none"/><circle cx="123" cy="151" r="2" fill="#302e46"/><circle cx="123" cy="164" r="2" fill="#302e46"/></>}
    {id === 'artist' && <><path d="M85 109 H96 V158 H124 V109 H135 V197 H85 Z" fill="#db7067"/><rect x="99" y="151" width="22" height="20" rx="3" fill="#e7aa6e"/><circle cx="92" cy="187" r="5"/><circle cx="128" cy="175" r="4" fill="#81cbb6"/></>}
    {id === 'swordsman' && <><path d="M82 115 L110 136 L138 115 L131 164 H89 Z"/><path d="M84 182 H136 V195 H84 Z M81 211 H104 V239 H81 Z M116 211 H139 V239 H116 Z"/><path d="M94 143 H126 M98 154 H122" fill="none"/></>}
    {id === 'dualblade' && <><path d="M88 108 L132 176 M132 108 L88 176" fill="none" stroke="#f4c65d" strokeWidth="6"/><path d="M74 176 H146 V189 H74 Z" fill="#62677e"/></>}
    {id === 'energy' && <><path d="M110 117 L92 148 H110 L101 176 L130 139 H112 L125 117 Z"/><path d="M78 183 H142 V195 H78 Z"/></>}
  </g>;
}

function BackDetails({ id }: { id: AvatarId }) {
  const d = CHARACTER_DESIGNS[id];
  return <g>
    {['tiger', 'monkey', 'gecko', 'dragon'].includes(id) && <><path d="M143 181 Q187 201 169 240 Q155 263 143 242" fill="none" stroke="#302e46" strokeWidth="17"/><path d="M143 181 Q187 201 169 240 Q155 263 143 242" fill="none" stroke={d.skin} strokeWidth="12"/>{id === 'tiger' && <path d="M168 218 L176 221 M161 246 L165 237" fill="none" stroke="#302e46" strokeWidth="5"/>}</>}
    {id === 'dragon' && <><path d="M82 117 Q53 86 44 139 L57 137 L61 156 L82 148 M138 117 Q167 86 176 139 L163 137 L159 156 L138 148" fill={d.accent}/><path d="M160 206 L176 201 L171 218 L181 222 L170 235" fill={d.accent}/></>}
    {id === 'phoenix' && <><path d="M88 126 L59 104 L43 147 L57 149 L48 176 L72 165 L66 188 L88 168 M132 126 L161 104 L177 147 L163 149 L172 176 L148 165 L154 188 L132 168" fill={d.accent}/><path d="M98 180 L76 246 L97 232 L110 270 L124 232 L146 246 L122 180" fill={d.shirt}/></>}
    {id === 'astronaut' && <rect x="67" y="112" width="86" height="62" rx="14" fill="#c0dbe0"/>}
    {id === 'student' && <rect x="68" y="113" width="81" height="59" rx="14" fill={d.accent}/>}
    {id === 'artist' && <g transform="rotate(15 150 163)"><rect x="148" y="148" width="7" height="59" rx="3" fill="#f4c65d"/><path d="M148 148 Q142 132 153 128 Q166 133 155 148 Z" fill={d.accent}/></g>}
    {id === 'ninja' && <path d="M96 98 Q57 111 53 88 L33 99 L42 116 Q74 132 104 104" fill={d.accent}/>}
    {['swordsman', 'dualblade'].includes(id) && <g transform="rotate(-25 110 150)"><rect x="149" y="57" width="12" height="132" rx="6" fill="#dbe6e8"/><path d="M155 67 V178" fill="none"/><rect x="142" y="178" width="26" height="9" rx="3" fill="#f4c65d"/><rect x="150" y="187" width="10" height="21" rx="3" fill="#8062cc"/>{id === 'dualblade' && <g transform="translate(-80 0)"><rect x="149" y="57" width="12" height="132" rx="6" fill="#dbe6e8"/><rect x="142" y="178" width="26" height="9" rx="3" fill="#f4c65d"/><rect x="150" y="187" width="10" height="21" rx="3" fill="#8062cc"/></g>}</g>}
    {id === 'bazooka' && <g transform="rotate(22 151 145)"><rect x="144" y="87" width="24" height="113" rx="8" fill={d.accent}/><rect x="139" y="86" width="34" height="21" rx="5" fill="#c0dbe0"/><rect x="149" y="88" width="14" height="12" rx="4" fill="#302e46"/></g>}
  </g>;
}

function Hand({ skin, type }: { skin: string; type: 'fist' | 'open' | 'fingers' | 'hook'; }) {
  return <g fill={skin}>
    {type === 'fist' ? <><rect x="-9" y="-9" width="18" height="19" rx="6"/><path d="M-5 -5 V1 M0 -5 V1 M5 -5 V1" fill="none" strokeWidth="1.5"/></> :
      type === 'fingers' ? <><path d="M-8 7 V-4 Q-8 -8 -5 -8 V-23 Q-5 -27 -2 -27 Q1 -27 1 -23 Q1 -27 4 -27 Q7 -27 7 -23 V-8 Q12 -9 12 -3 V7 Q2 16 -8 7 Z"/><path d="M1 -23 V-8 M-4 -3 L2 2" fill="none" strokeWidth="1.5"/></> :
      type === 'hook' ? <><path d="M-10 6 L-10 -5 Q-10 -10 -5 -10 H10 Q15 -10 15 -5 Q15 0 10 0 H1 V6 Q-4 13 -10 6 Z"/><path d="M0 -5 H10" fill="none" strokeWidth="1.5"/></> :
        <><path d="M-8 8 V-13 Q-8 -17 -4 -17 V-19 Q-4 -23 0 -23 Q4 -23 4 -19 Q8 -23 11 -19 V-14 Q16 -17 17 -11 V4 Q16 16 4 17 Q-3 16 -8 8 Z"/><path d="M-4 -14 V0 M4 -17 V0 M11 -13 V0" fill="none" strokeWidth="1.4"/></>}
  </g>;
}

export function Character({ profile, state = 'idle', move, facing = 'right', reduced = false, cycle = 'preview', casual = false }: {
  profile: AvatarProfile; state?: CharacterState; move?: MoveId; facing?: 'left' | 'right'; reduced?: boolean; cycle?: string; casual?: boolean;
}) {
  const { t } = useLanguage();
  const id = useId().replace(/:/g, '');
  const design = CHARACTER_DESIGNS[profile.avatarId], avatar = avatarById(profile.avatarId);
  const posedState = state === 'blocked' ? (move?.startsWith('block') ? move as 'block1' | 'block2' | 'block3' : 'block1') : state;
  const pose = POSES[posedState], windup = WINDUP[posedState] ?? pose;
  const hands = posedState === 'block2' || posedState === 'klarteang' ? 'fingers' : posedState === 'block3' ? 'hook' : ['ching', 'swing', 'clap', 'victory'].includes(posedState) ? 'open' : 'fist';
  const attack = ['ching', 'swing', 'klarteang', 'seuteang'].includes(state);
  return <svg viewBox="0 0 220 290" className={`character state-${state} ${reduced ? 'character-reduced' : ''}`} role="img" aria-label={`${avatar.name}: ${t(STATE_LABELS[state])}`} data-avatar={profile.avatarId} data-state={state} data-facing={facing} style={{ '--move-duration': `${ROUND_TIMING.move}ms`, '--clap-duration': `${ROUND_TIMING.clapBeat}ms` } as Vars}>
    <defs><clipPath id={`head-${id}`}><rect x="59" y="10" width="102" height={profile.avatarId === 'wizard' ? 108 : 100}/></clipPath></defs>
    <ellipse cx="110" cy="273" rx="56" ry="7" fill="#302e4615"/>
    <g transform={facing === 'left' ? 'translate(220 0) scale(-1 1)' : undefined}>
      <g key={`${cycle}-${profile.avatarId}-${state}`} className="character-body" stroke="#302e46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {!casual && <BackDetails id={profile.avatarId}/>}
        <g className="character-legs"><path d="M94 188 L90 256 M126 188 L132 256" fill="none" stroke="#302e46" strokeWidth="24"/><path d="M94 188 L90 256 M126 188 L132 256" fill="none" stroke={design.pants} strokeWidth="19"/>
          {profile.avatarId === 'runner' && <path d="M92 219 L90 253 M129 219 L132 253" fill="none" stroke={design.skin} strokeWidth="18"/>}
          <path d="M90 250 Q79 248 76 263 Q83 272 100 266 L101 255 Z M132 250 Q143 248 147 263 Q140 272 123 266 L121 255 Z" fill={design.shoes}/>
          {design.type === 'animal' && <path d="M83 258 V265 M90 259 V266 M132 259 V266 M139 258 V265" fill="none" strokeWidth="1.5"/>}
        </g>
        <rect x="100" y="88" width="20" height="30" rx="7" fill={design.skin}/>
        <path d="M77 108 Q110 95 143 108 L149 190 Q110 205 71 190 Z" fill={design.shirt}/>
        {casual ? <g><path d="M89 106 Q110 124 131 106" fill="none" stroke={design.accent} strokeWidth="5"/>{profile.avatarId === 'student' && <><path d="M88 109 L98 113 L94 162 L82 159Z" fill="#ad3034"/><path d="M86 126 L97 128 M85 139 L96 141 M84 152 L94 154 M90 115 L86 158" fill="none" stroke="#fff4dc" strokeWidth="2"/></>}</g> : <Outfit id={profile.avatarId}/>}
        <g className="character-head"><image href={`${import.meta.env.BASE_URL}characters/heads/${profile.avatarId}.svg`} x="60" y="13" width="100" height="100" clipPath={`url(#head-${id})`}/>{casual && profile.avatarId === 'runner' && <><defs><pattern id={`krama-${id}`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff4dc"/><path d="M0 2H8M2 0V8" stroke="#ad3034" strokeWidth="3" opacity=".9"/></pattern></defs><path d="M84 48Q110 42 137 48V56Q110 50 84 56Z" fill={`url(#krama-${id})`} stroke="#302e46" strokeWidth="2"/></>}</g>
        {[0, 1].map(side => {
          const offset = side * 2;
          const upper: Vars = { '--angle': `${pose[offset]}deg`, '--windup': `${windup[offset]}deg`, '--clap-away': `${pose[offset] + (side === 0 ? 18 : -18)}deg` };
          const lower: Vars = { '--angle': `${pose[offset + 1]}deg`, '--windup': `${windup[offset + 1]}deg`, '--clap-away': `${pose[offset + 1]}deg` };
          const handTurn = posedState === 'block3' ? side === 0 ? 90 : -90 : posedState === 'reload' || posedState === 'block2' ? 180 : posedState === 'clap' ? side === 0 ? -20 : 20 : 180;
          return <g key={side} transform={`translate(${side === 0 ? 75 : 145} 117)`}><g className="limb upper-arm" style={upper}>
            <path d="M0 0 V36" strokeWidth="17"/><path d="M0 0 V36" stroke={design.skin} strokeWidth="12"/>
            <path d="M0 0 V13" stroke={design.shirt} strokeWidth="14"/>
            <g transform="translate(0 36)"><g className="limb forearm" style={lower}><path d="M0 0 V42" strokeWidth="16"/><path d="M0 0 V42" stroke={design.skin} strokeWidth="11"/>
              {design.type === 'robot' && <circle cy="0" r="7" fill={design.accent}/>}
              <g transform={`translate(0 42) rotate(${handTurn})`}><Hand skin={design.skin} type={hands}/></g>
            </g></g>
          </g></g>;
        })}
        {attack && <g className={`move-effect effect-${state}`} fill="none" stroke={design.accent} strokeWidth="4">
          {state === 'seuteang' ? <><circle cx="183" cy="101" r="15"/><path d="M171 101 H198 M185 88 V114 M201 94 L211 87 M201 106 L211 113"/></> : state === 'swing' ? <><path d="M26 111 Q5 150 45 178 M36 115 Q16 151 54 174"/><path d="M40 181 L23 173 L26 190"/></> : <><path d="M166 89 Q211 120 190 178 M175 85 Q220 121 199 170"/><path d="M193 177 L192 194 L206 183"/></>}
        </g>}
        {state === 'reload' && <g className="reload-effect" fill={design.accent} strokeWidth="2"><circle cx="37" cy="60" r="7"/><circle cx="177" cy="60" r="7"/><path d="M37 44 V51 M33 47 H41 M177 44 V51 M173 47 H181" fill="none"/></g>}
        {state === 'blocked' && <g className="block-effect" fill="none" stroke={design.accent} strokeWidth="4"><path d="M166 111 L195 121 L192 157 L179 170 L165 155 Z"/><path d="M201 120 L211 114 M201 150 L214 156"/></g>}
        {state === 'hit' && <g className="hit-effect" fill="#f4c65d"><path d="M159 100 L165 84 L173 99 L190 97 L181 111 L192 124 L174 122 L165 139 L160 120 L142 115 Z"/></g>}
        {state === 'victory' && <g className="victory-effect" fill={design.accent}><path d="M36 60 L40 70 L51 73 L40 77 L36 88 L32 77 L21 73 L32 70 Z M182 36 L186 46 L197 49 L186 53 L182 64 L178 53 L167 49 L178 46 Z"/><circle cx="170" cy="182" r="5"/></g>}
        {state === 'defeat' && <g fill="#c9e5f4"><path d="M158 62 Q148 80 157 84 Q168 80 158 62 Z"/></g>}
      </g>
    </g>
  </svg>;
}

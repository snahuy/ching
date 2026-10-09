import type { MoveId } from './rules';
export function Gesture({ move = 'reload', rival = false, small = false, icon = false }: { move?: MoveId; rival?: boolean; small?: boolean; icon?: boolean }) {
  const skin = rival ? '#d99060' : '#efbd91';
  const shirt = rival ? '#d2ef6b' : '#9f86ff';
  const arms: Record<MoveId, [string, string]> = {
    reload: ['M78 122 L57 122 L57 76', 'M122 122 L143 122 L143 76'],
    ching: ['M78 118 L102 137 L145 164', 'M122 118 L143 133 L168 148'],
    swing: ['M78 118 L58 134 L32 151', 'M122 118 L96 138 L55 164'],
    klarteang: ['M78 118 L100 138 L144 158', 'M122 118 L143 133 L169 146'],
    seuteang: ['M78 122 L151 82 L139 115', 'M122 122 L119 102 L143 94'],
    block1: ['M78 127 L125 83', 'M122 127 L75 83'],
    block2: ['M78 122 L57 122 L57 80', 'M122 122 L143 122 L143 80'],
    block3: ['M78 120 L60 141 L107 141', 'M122 120 L143 132 L98 132'],
  };
  const ends: Record<MoveId, [number, number, number, number]> = { reload: [57, 76, 143, 76], ching: [145, 164, 168, 148], swing: [32, 151, 55, 164], klarteang: [144, 158, 169, 146], seuteang: [139, 115, 143, 94], block1: [125, 83, 75, 83], block2: [57, 80, 143, 80], block3: [107, 141, 98, 132] };
  const fingers = move === 'klarteang' || move === 'block2';
  return <svg viewBox={icon ? "20 48 165 138" : "0 0 200 210"} className={`gesture ${icon ? 'gesture-icon' : ''} ${small ? 'small' : ''}`} aria-hidden="true">
    {!icon && <>
    {!small && <ellipse cx="100" cy="199" rx="51" ry="7" fill="#302e4615"/>}
    <path d="M83 169 L80 196 M117 169 L120 196" stroke="#302e46" strokeWidth="19" strokeLinecap="round"/>
    <path d="M77 112 Q100 99 123 112 L132 173 Q100 184 68 173 Z" fill={shirt} stroke="#302e46" strokeWidth="3"/>
    <path d="M91 103 L91 116 Q100 122 109 116 L109 103" fill={skin} stroke="#302e46" strokeWidth="2.5"/>
    <rect x="72" y="40" width="56" height="67" rx="26" fill={skin} stroke="#302e46" strokeWidth="3"/>
    <path d={rival ? 'M72 66 Q65 31 96 33 Q135 26 130 65 L113 50 L84 57 Z' : 'M71 66 Q61 28 102 33 Q138 29 129 66 L116 51 Q97 66 77 53 Z'} fill="#302e46"/>
    <path d="M82 71 L91 69 M109 69 L118 71" stroke="#302e46" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="87" cy="77" r="2.7" fill="#302e46"/><circle cx="113" cy="77" r="2.7" fill="#302e46"/>
    <path d="M92 92 Q100 98 108 91" fill="none" stroke="#302e46" strokeWidth="2.5" strokeLinecap="round"/>
    </>}
    <g className="gesture-arms" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {arms[move].map((d, i) => <g key={i}><path d={d} stroke="#302e46" strokeWidth="17"/><path d={d} stroke={skin} strokeWidth="12"/></g>)}
      {[0, 1].map(i => {
        const x = ends[move][i * 2], y = ends[move][i * 2 + 1];
        return <g key={i} stroke="#302e46" strokeWidth="2.5" fill={skin} transform={move === 'klarteang' ? `rotate(125 ${x} ${y})` : undefined}>
          {move === 'reload' ? <><rect x={x - 8} y={y - 10} width="16" height="17" rx="5"/><path d={`M${x - 4} ${y - 6} v5 m4 -5 v5 m4 -5 v5`} fill="none" strokeWidth="1.4"/></> : fingers ? <><rect x={x - 7} y={y - 6} width="14" height="14" rx="5"/><path d={`M${x - 3} ${y - 3} v-17 m6 17 v-17`} stroke={skin} strokeWidth="5"/><path d={`M${x - 5.5} ${y - 3} v-17 m11 17 v-17`} fill="none" strokeWidth="1.5"/></> : move === 'ching' || move === 'swing' ? <g transform={`rotate(${move === 'swing' ? -125 : 125} ${x} ${y})`}><path d={`M${x-7} ${y+6} v-16 q0 -3 3 -3 v-4 q0 -3 3 -3 q3 0 3 3 v1 q3 -4 5 0 v4 q5 -2 5 3 v11 q0 9 -9 9 Z`}/><path d={`M${x-4} ${y-11} v10 m6 -16 v15 m5 -11 v12`} fill="none" strokeWidth="1"/></g> : <><ellipse cx={x} cy={y} rx="8" ry="10" transform={`rotate(${move === 'block3' ? 90 : -35} ${x} ${y})`}/><path d={`M${x - 4} ${y - 5} l4 5 m0 -7 l4 5`} strokeWidth="1.2"/></>}
        </g>;
      })}
    </g>
    {!small && !icon && (move === 'ching' || move === 'swing' || move === 'klarteang') && <g stroke="#7660c1" strokeWidth="3" strokeLinecap="round"><path d={move === 'swing' ? 'M51 103 L24 123 M47 113 L21 134' : 'M150 105 L182 130 M153 117 L183 143'}/></g>}
  </svg>;
}

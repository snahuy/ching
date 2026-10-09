import type { AvatarId } from './avatars';
export type CharacterDesign = { skin: string; shirt: string; pants: string; accent: string; shoes: string; type: 'human' | 'robot' | 'animal' | 'robe' | 'bird' | 'stone' };
// The colors come directly from the original avatar drawing source.
// All designs use the same dimensions, limb lengths, and gesture rig.
export const CHARACTER_DESIGNS: Record<AvatarId, CharacterDesign> = {
  student: { skin: '#bd825b', shirt: '#fefaf0', pants: '#62677e', accent: '#9f86ff', shoes: '#302e46', type: 'human' },
  dancer: { skin: '#c68b62', shirt: '#b571be', pants: '#b571be', accent: '#f4c65d', shoes: '#c68b62', type: 'robe' },
  bokator: { skin: '#a36547', shirt: '#81cbb6', pants: '#f4d9b0', accent: '#db7067', shoes: '#a36547', type: 'human' },
  guardian: { skin: '#a6c5b3', shirt: '#8caf9d', pants: '#8caf9d', accent: '#bad4bd', shoes: '#a6c5b3', type: 'stone' },
  tiger: { skin: '#f2ab55', shirt: '#f2ab55', pants: '#f2ab55', accent: '#fff0d3', shoes: '#f2ab55', type: 'animal' },
  elephant: { skin: '#a2b3d1', shirt: '#9f86ff', pants: '#a2b3d1', accent: '#d6b1d7', shoes: '#a2b3d1', type: 'animal' },
  gecko: { skin: '#a6d46b', shirt: '#81cbb6', pants: '#a6d46b', accent: '#dfefb5', shoes: '#a6d46b', type: 'animal' },
  monkey: { skin: '#b57e59', shirt: '#b57e59', pants: '#b57e59', accent: '#f0c595', shoes: '#b57e59', type: 'animal' },
  robot: { skin: '#c0dbe0', shirt: '#81cbb6', pants: '#c0dbe0', accent: '#f4c65d', shoes: '#81cbb6', type: 'robot' },
  astronaut: { skin: '#f9f5ed', shirt: '#f9f5ed', pants: '#f9f5ed', accent: '#9f86ff', shoes: '#9f86ff', type: 'human' },
  ninja: { skin: '#d99d78', shirt: '#302e46', pants: '#665c89', accent: '#81cbb6', shoes: '#302e46', type: 'human' },
  pirate: { skin: '#e2a77f', shirt: '#d87991', pants: '#62677e', accent: '#f4c65d', shoes: '#784b3b', type: 'human' },
  dragon: { skin: '#81cbb6', shirt: '#81cbb6', pants: '#81cbb6', accent: '#d2ef6b', shoes: '#81cbb6', type: 'animal' },
  phoenix: { skin: '#f4c65d', shirt: '#e87665', pants: '#e87665', accent: '#f1a055', shoes: '#f4c65d', type: 'bird' },
  wizard: { skin: '#d4a783', shirt: '#9f86ff', pants: '#9f86ff', accent: '#f4c65d', shoes: '#784b3b', type: 'robe' },
  spirit: { skin: '#b5d5a3', shirt: '#699b83', pants: '#699b83', accent: '#f4c65d', shoes: '#81b879', type: 'robe' },
  gamer: { skin: '#82583f', shirt: '#9f86ff', pants: '#62677e', accent: '#81cbb6', shoes: '#81cbb6', type: 'human' },
  runner: { skin: '#a46b4c', shirt: '#81cbb6', pants: '#302e46', accent: '#fff4dc', shoes: '#fff4dc', type: 'human' },
  chef: { skin: '#e8b895', shirt: '#fff4dc', pants: '#62677e', accent: '#db7067', shoes: '#302e46', type: 'human' },
  artist: { skin: '#bd815c', shirt: '#e7aa6e', pants: '#db7067', accent: '#9f86ff', shoes: '#e7aa6e', type: 'human' },
  swordsman: { skin: '#c68b62', shirt: '#9f86ff', pants: '#62677e', accent: '#dbe6e8', shoes: '#dbe6e8', type: 'human' },
  dualblade: { skin: '#855b43', shirt: '#81cbb6', pants: '#dfe6ee', accent: '#f4c65d', shoes: '#62677e', type: 'human' },
  energy: { skin: '#b67e5c', shirt: '#9f86ff', pants: '#665c89', accent: '#81cbb6', shoes: '#81cbb6', type: 'human' },
  bazooka: { skin: '#c0dbe0', shirt: '#9f86ff', pants: '#c0dbe0', accent: '#81cbb6', shoes: '#9f86ff', type: 'robot' },
};

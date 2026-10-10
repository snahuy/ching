export const CATEGORIES = ['All', 'Cambodia-inspired', 'Creator', 'Animals', 'Fantasy', 'Everyday personalities', 'Game-themed'] as const;
export type Category = typeof CATEGORIES[number];
const LEGACY_AVATARS = [
  { id: 'student', name: 'Sokha Spark', category: 'Cambodian-inspired', description: 'Modern Khmer student with a crisp school shirt and a curious grin.' },
  { id: 'dancer', name: 'Malis Grace', category: 'Cambodian-inspired', description: 'Khmer dancer with a golden pointed crown and a bright dance sash.' },
  { id: 'bokator', name: 'Dara Brave', category: 'Cambodian-inspired', description: 'Bokator fighter with a coral headband and a calm, confident smile.' },
  { id: 'guardian', name: 'Angkor Amigo', category: 'Cambodian-inspired', description: 'Friendly stone guardian inspired by Angkor, with a gentle carved smile.' },
  { id: 'tiger', name: 'Tavi Stripes', category: 'Animals', description: 'Golden tiger with bold stripes and a soft cream muzzle.' },
  { id: 'elephant', name: 'Bopa Jumbo', category: 'Animals', description: 'Lavender-gray elephant with huge ears and a curling trunk.' },
  { id: 'gecko', name: 'Gigi Gecko', category: 'Animals', description: 'Green gecko with big bright eyes and tiny climbing toes.' },
  { id: 'monkey', name: 'Momo Mischief', category: 'Animals', description: 'Cheerful monkey with round ears and a bouncy hair curl.' },
  { id: 'robot', name: 'Beep Buddy', category: 'Fun characters', description: 'Smiling mint robot with glowing eyes and a golden antenna.' },
  { id: 'astronaut', name: 'Nova Orbit', category: 'Fun characters', description: 'Curly-haired astronaut in a round helmet with violet ear pieces.' },
  { id: 'ninja', name: 'Nori Shadow', category: 'Fun characters', description: 'Playful masked ninja with a mint headband and flowing ribbon.' },
  { id: 'pirate', name: 'Captain Pippa', category: 'Fun characters', description: 'Bob-haired pirate with a gem hat, eye patch, and golden hoop.' },
  { id: 'dragon', name: 'Jade Puff', category: 'Fantasy', description: 'Friendly mint dragon with golden horns and leafy wings.' },
  { id: 'phoenix', name: 'Ember Rise', category: 'Fantasy', description: 'Coral phoenix with a flame crest and golden feathers.' },
  { id: 'wizard', name: 'Willa Wonder', category: 'Fantasy', description: 'Silver-haired wizard with round glasses and a crooked violet hat.' },
  { id: 'spirit', name: 'Fern Whisper', category: 'Fantasy', description: 'Forest spirit with leaf ears, mossy hair, and a golden leaf pendant.' },
  { id: 'gamer', name: 'Pixel Pulse', category: 'Everyday personalities', description: 'Curly-haired gamer with mint headphones and a microphone.' },
  { id: 'runner', name: 'Rae Rocket', category: 'Everyday personalities', description: 'Runner with a high bun, cream headband, and mint racing top.' },
  { id: 'chef', name: 'Chef Nibble', category: 'Everyday personalities', description: 'Smiling chef with a puffy white hat and a coral neckerchief.' },
  { id: 'artist', name: 'Remy Doodle', category: 'Everyday personalities', description: 'Side-swept artist with a coral beret and violet-tipped paintbrush.' },
  { id: 'swordsman', name: 'Ching Champ', category: 'Game-themed', description: 'Ching swordsman with a gem headguard and a rounded toy blade.' },
  { id: 'dualblade', name: 'Swing Twin', category: 'Game-themed', description: 'Silver-haired Swing fighter carrying two rounded cartoon blades.' },
  { id: 'energy', name: 'Klarteang Bolt', category: 'Game-themed', description: 'Violet-haired energy fighter with a bright mint power crystal.' },
  { id: 'bazooka', name: 'Seuteang Boom', category: 'Game-themed', description: 'Grinning bazooka robot with a chunky mint cartoon launcher.' },
] as const;
const NEW_AVATARS = [
  {
    "id": "sok",
    "name": "Sok",
    "category": "Cambodia-inspired",
    "description": "Cambodian schoolboy in a white school shirt and navy trousers."
  },
  {
    "id": "sokha",
    "name": "Sokha",
    "category": "Cambodia-inspired",
    "description": "Cambodian schoolgirl with a neat ponytail, white school blouse, and navy skirt."
  },
  {
    "id": "buntheoun",
    "name": "Buntheoun",
    "category": "Cambodia-inspired",
    "description": "Cambodian man in a traditional silk shirt and sampot with a gold sash."
  },
  {
    "id": "bopha",
    "name": "Bopha",
    "category": "Cambodia-inspired",
    "description": "Cambodian woman in a traditional blouse and patterned sampot with a shoulder sash."
  },
  {
    "id": "pu-som",
    "name": "Pu Som",
    "category": "Cambodia-inspired",
    "description": "Friendly Cambodian uncle in a farmer’s shirt, straw hat, and red krama."
  },
  {
    "id": "ming-ya",
    "name": "Ming Ya",
    "category": "Cambodia-inspired",
    "description": "Friendly Cambodian auntie in a farmer’s blouse, woven hat, and blue krama."
  },
  {
    "id": "bro-sna",
    "name": "Bro Sna",
    "category": "Creator",
    "description": "Light-skinned Cambodian young man with short hair and glasses, wearing a tailored charcoal suit, ivory shirt, burgundy tie, and polished shoes."
  },
  {
    "id": "vandeoun",
    "name": "Vandeoun",
    "category": "Cambodia-inspired",
    "description": "Cambodian Bokator fighter with an athletic build, traditional headband, arm cords, and a confident guard."
  }
] as const;
export type AvatarId = typeof LEGACY_AVATARS[number]['id'] | typeof NEW_AVATARS[number]['id'];
const REMOVED_IDS: readonly string[] = ["student", "dancer", "robot", "astronaut", "ninja", "pirate", "phoenix", "wizard", "spirit", "gamer", "runner"];
export const AVATARS = [...NEW_AVATARS, ...LEGACY_AVATARS.filter(a=>!REMOVED_IDS.includes(a.id)).map(a=>({...a, name:a.id==='bazooka'?'Robot':a.name, category:a.category==='Cambodian-inspired'?'Cambodia-inspired' as const:a.category}))];
export const BACKGROUNDS = [
  { id: 'lavender', name: 'Lavender', color: '#e4d9fa' },
  { id: 'lime', name: 'Lime', color: '#dfefb5' },
  { id: 'sky', name: 'Sky', color: '#c9e5f4' },
  { id: 'peach', name: 'Peach', color: '#f5d1b5' },
  { id: 'rose', name: 'Rose', color: '#f2cddd' },
  { id: 'mint', name: 'Mint', color: '#c7e8d8' },
  { id: 'sand', name: 'Sand', color: '#f4e4b5' },
  { id: 'slate', name: 'Slate', color: '#bbc6db' },
] as const;
export type BackgroundId = typeof BACKGROUNDS[number]['id'];
export type AvatarProfile = { avatarId: AvatarId; backgroundId: BackgroundId };
export const DEFAULT_PROFILE: AvatarProfile = { avatarId: 'sok', backgroundId: 'lavender' };
export const PROFILE_KEY = 'ching.avatar.v1';
export function avatarById(id: AvatarId) { return AVATARS.find(avatar => avatar.id === id) ?? AVATARS[0]; }
export function backgroundById(id: BackgroundId) { return BACKGROUNDS.find(background => background.id === id)!; }
type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;
export const OPPONENT_PROFILE_KEY = "ching.opponent.v1";
export const DEFAULT_OPPONENT_PROFILE: AvatarProfile = { avatarId: "bazooka", backgroundId: "rose" };
export function readProfile(storage: StorageReader, key = PROFILE_KEY, fallback = DEFAULT_PROFILE): AvatarProfile {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? 'null');
    if (!value || typeof value !== 'object') return { ...fallback };
    const candidate = value as Record<string, unknown>;
    return {
      avatarId: AVATARS.some(a => a.id === candidate.avatarId) ? candidate.avatarId as AvatarId : fallback.avatarId,
      backgroundId: BACKGROUNDS.some(b => b.id === candidate.backgroundId) ? candidate.backgroundId as BackgroundId : fallback.backgroundId,
    };
  } catch { return { ...fallback }; }
}
export function saveProfile(storage: StorageWriter, profile: AvatarProfile, key = PROFILE_KEY): boolean {
  try { storage.setItem(key, JSON.stringify(profile)); return true; } catch { return false; }
}
export function randomAvatar(current?: AvatarId, random: () => number = Math.random): AvatarId {
  const pool = AVATARS.filter(a => a.id !== current);
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))].id;
}
export function randomOpponent(player: AvatarId): AvatarProfile {
  return { avatarId: randomAvatar(player), backgroundId: BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)].id };
}

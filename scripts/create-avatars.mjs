// Original Ching artwork. Each icon uses the same rounded ink outline,
// large silhouette, and face proportions, without external image resources.
import { mkdir, writeFile } from 'node:fs/promises';
const ink = '#302e46', gold = '#f4c65d', purple = '#9f86ff', mint = '#81cbb6';
const shape = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const rect = (x,y,w,h,r,fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const line = d => shape(d, 'none');
const eyes = (y = 53) => `<g fill="${ink}" stroke="none">${circle(39,y,3.5,ink)}${circle(61,y,3.5,ink)}</g>`;
const smile = (y = 67) => line(`M42 ${y} Q50 ${y+7} 58 ${y}`);
const cheeks = () => `<g stroke="none" opacity=".55">${circle(32,62,4,'#ef8e88')}${circle(68,62,4,'#ef8e88')}</g>`;
const hair = {
  crop: shape('M23 45 Q16 13 48 15 Q80 10 77 45 L66 33 Q44 40 30 29 Z', ink),
  curl: [circle(27,31,10,ink),circle(36,22,11,ink),circle(51,20,12,ink),circle(66,24,11,ink),circle(74,35,9,ink)].join(''),
  bob: shape('M21 73 V42 Q17 13 50 14 Q83 13 80 44 V74 L69 76 V33 L51 30 L31 42 V76 Z', ink),
  swoop: shape('M24 46 Q16 10 51 14 Q76 7 79 35 L70 44 L67 29 Q52 48 24 46 Z', '#784b3b'),
  bun: circle(65,15,11,ink)+shape('M24 44 Q16 16 50 16 Q80 13 77 44 Q64 41 52 29 Q41 42 24 44 Z',ink),
  silver: shape('M22 43 L25 21 L40 23 L49 12 L59 23 L76 18 L78 44 L66 34 L44 38 L31 30 Z','#dfe6ee'),
};
const human = (skin, shirt, hairstyle, extra = '') =>
  shape('M13 103 V91 Q16 77 38 77 H62 Q84 77 87 91 V103 Z',shirt)+
  shape('M41 70 V82 Q50 90 59 82 V70',skin)+
  (hairstyle === 'bob' ? hair.bob : '')+
  rect(25,23,50,55,23,skin)+hair[hairstyle]+eyes()+cheeks()+smile()+extra;
const gem = (x,y,color) => shape(`M${x} ${y-6} L${x+5} ${y} L${x} ${y+6} L${x-5} ${y} Z`, color);
const sword = (x, flip = false) => `<g transform="translate(${x} 0) ${flip?'scale(-1 1)':''}">${shape('M0 68 L0 22 Q4 15 8 22 L8 68 Z','#e6f6f3')}${line('M4 26 V61')}${rect(-4,66,16,6,2,gold)}${rect(1,72,6,14,2,'#8062cc')}</g>`;
const art = {
  student: human('#bd825b','#fefaf0','crop',shape('M35 79 L50 91 L65 79 L59 97 H41 Z','#e9edf4')+line('M50 91 V101')+rect(61,89,13,8,2,purple)),
  dancer: human('#c68b62','#b571be','bun',shape('M24 35 L26 20 L38 25 L50 5 L62 25 L74 20 L76 35 Z',gold)+gem(50,25,'#d87991')+circle(22,55,4,gold)+circle(78,55,4,gold)+shape('M29 87 L70 78 L76 91 L35 100 Z',gold)),
  bokator: human('#a36547',mint,'crop',shape('M23 35 Q50 26 77 35 L76 43 Q50 35 24 43 Z','#db7067')+shape('M23 38 L12 48 L18 52 L29 40 Z','#db7067')+shape('M35 79 L50 98 L65 79 L69 101 H31 Z','#f4d9b0')),
  guardian: shape('M16 105 V87 Q17 75 34 73 H66 Q83 75 84 87 V105 Z','#8caf9d')+shape('M24 35 L28 17 H38 L42 9 H58 L62 17 H72 L76 35 Z','#a6c5b3')+rect(23,30,54,51,18,'#a6c5b3')+line('M28 34 H72 M35 19 H65 M31 48 Q39 44 45 48 M55 48 Q61 44 69 48 M34 55 H43 M57 55 H66 M48 51 L45 63 H55 M38 70 Q50 79 62 70')+shape('M33 85 L50 96 L67 85','#bad4bd'),
  tiger: shape('M15 105 Q15 78 50 77 Q85 78 85 105','#f2ab55')+circle(25,28,13,'#f2ab55')+circle(75,28,13,'#f2ab55')+circle(25,28,6,'#f4d9b0')+circle(75,28,6,'#f4d9b0')+rect(20,25,60,57,24,'#f2ab55')+shape('M38 26 L42 42 L47 27 M53 27 L58 42 L62 26 M21 47 L33 52 L21 57 M79 47 L67 52 L79 57',ink)+eyes()+shape('M29 65 Q29 54 50 61 Q71 54 71 65 Q69 80 50 81 Q31 80 29 65 Z','#fff0d3')+shape('M44 61 Q50 57 56 61 L50 67 Z',ink)+line('M50 67 V71 M38 70 Q44 76 50 71 Q56 76 62 70'),
  elephant: shape('M16 105 Q16 78 50 77 Q84 78 84 105',purple)+shape('M29 29 Q3 23 9 59 Q11 76 31 68 M71 29 Q97 23 91 59 Q89 76 69 68','#a2b3d1')+shape('M23 33 Q9 30 15 58 Q17 66 25 61 M77 33 Q91 30 85 58 Q83 66 75 61','#d6b1d7')+rect(26,22,48,52,21,'#a2b3d1')+eyes(48)+shape('M41 58 H59 V75 Q59 89 72 79 Q74 91 62 92 Q43 96 41 78 Z','#a2b3d1')+line('M45 68 H55 M45 75 H55')+shape('M29 62 Q24 80 39 75 M71 62 Q76 80 61 75','#fff4dc')+shape('M40 25 Q45 15 56 21',purple),
  gecko: shape('M20 104 Q20 77 50 75 Q80 77 80 104',mint)+shape('M25 39 Q15 52 22 71 Q30 87 50 83 Q70 87 78 71 Q85 52 75 39 Z','#a6d46b')+circle(29,35,14,'#a6d46b')+circle(71,35,14,'#a6d46b')+circle(29,35,8,'#fff9e9')+circle(71,35,8,'#fff9e9')+circle(30,36,4,ink)+circle(70,36,4,ink)+smile(63)+circle(37,54,4,'#79b557')+circle(63,54,4,'#79b557')+shape('M19 81 L10 74 M19 81 L8 83 M19 81 L13 93 M81 81 L90 74 M81 81 L92 83 M81 81 L87 93','none'),
  monkey: shape('M16 105 Q16 77 50 76 Q84 77 84 105','#b57e59')+circle(22,49,13,'#b57e59')+circle(78,49,13,'#b57e59')+circle(22,49,7,'#f0c595')+circle(78,49,7,'#f0c595')+rect(23,23,54,59,25,'#b57e59')+shape('M29 50 Q26 28 43 36 Q50 43 57 36 Q74 28 71 50 L75 64 Q71 82 50 83 Q29 82 25 64 Z','#f0c595')+eyes()+smile()+shape('M41 25 Q36 8 50 13 Q59 16 52 24','#b57e59'),
  robot: shape('M17 105 V88 Q17 79 30 79 H70 Q83 79 83 88 V105 Z',mint)+line('M50 15 V26')+circle(50,12,6,gold)+rect(14,44,12,22,5,gold)+rect(74,44,12,22,5,gold)+rect(23,26,54,53,14,'#c0dbe0')+rect(31,39,38,22,7,ink)+circle(40,49,4,mint)+circle(60,49,4,mint)+shape('M37 68 H63 Q50 81 37 68 Z','#fffaf0')+rect(40,87,20,12,4,gold),
  astronaut: shape('M16 104 V88 Q19 77 34 75 H66 Q81 77 84 88 V104 Z','#f9f5ed')+circle(50,46,35,'#f9f5ed')+rect(21,30,58,40,18,'#c0dbe0')+human('#855942','#f9f5ed','curl')+shape('M20 59 Q23 82 50 82 Q77 82 80 59 L83 72 Q75 93 50 92 Q25 93 17 72 Z','#f9f5ed')+line('M20 41 Q17 15 42 12 M58 12 Q83 15 80 41')+rect(15,43,9,19,4,purple)+rect(76,43,9,19,4,purple)+rect(35,93,30,8,3,mint),
  ninja: shape('M16 105 Q16 77 50 77 Q84 77 84 105',ink)+rect(24,18,52,66,25,'#665c89')+shape('M24 44 Q50 35 76 44 V59 Q50 68 24 59 Z','#d99d78')+eyes(51)+shape('M23 29 Q50 21 77 29 V39 Q50 31 23 39 Z',mint)+shape('M75 31 L91 19 L94 30 L80 39 Z',mint)+shape('M28 88 L71 79 L76 91 L35 101 Z',mint),
  pirate: human('#e2a77f','#d87991','bob',shape('M14 35 L24 9 L41 16 L59 16 L76 9 L86 35 Z',ink)+shape('M17 33 H83 V42 H17 Z',gold)+gem(50,24,'#fff5dd')+shape('M52 46 H70 V56 Q60 63 52 56 Z',ink)+line('M27 40 L70 63')+circle(22,63,5,gold)),
  dragon: shape('M17 105 Q16 77 50 75 Q84 77 83 105',mint)+shape('M25 34 L21 12 L37 28 M75 34 L79 12 L63 28',gold)+shape('M22 41 L9 35 L13 53 L23 61 M78 41 L91 35 L87 53 L77 61','#d2ef6b')+rect(24,26,52,57,23,mint)+eyes()+rect(28,58,44,25,12,'#d2ef6b')+circle(40,66,2.5,ink)+circle(60,66,2.5,ink)+smile(73)+shape('M43 30 L50 18 L57 30',gold),
  phoenix: shape('M23 100 L7 75 L12 54 L29 65 M77 100 L93 75 L88 54 L71 65','#f1a055')+shape('M22 103 Q21 77 32 67 Q20 42 36 28 L34 11 L49 26 L56 6 L64 29 Q82 40 70 67 Q80 77 78 103 Z','#e87665')+shape('M32 55 Q34 34 48 40 L50 51 L52 40 Q66 34 68 55 L62 80 H38 Z',gold)+eyes(51)+shape('M43 62 L50 57 L57 62 L50 71 Z','#f5e8b0')+shape('M35 89 L50 99 L65 89 M14 72 L25 84 M86 72 L75 84','none'),
  wizard: human('#d4a783',purple,'silver',shape('M21 34 L39 10 Q43 3 48 13 L68 29 L78 34 Z',purple)+rect(15,33,70,9,4,purple)+gem(43,23,gold)+shape('M27 61 Q50 76 73 61 L67 85 L50 96 L33 85 Z','#e4e9ec')+smile(75)+circle(40,53,9,'none')+circle(60,53,9,'none')+line('M49 53 H51')),
  spirit: shape('M16 105 Q17 77 50 76 Q83 77 84 105','#699b83')+shape('M24 44 Q3 38 9 20 Q28 22 34 38 M76 44 Q97 38 91 20 Q72 22 66 38','#81b879')+rect(24,25,52,57,23,'#b5d5a3')+shape('M24 44 L24 26 Q37 15 45 28 Q52 4 65 15 Q80 22 76 43 L62 33 L48 43 L36 34 Z','#699b83')+eyes()+smile()+circle(33,62,4,gold)+circle(67,62,4,gold)+shape('M39 84 L50 76 L61 84 L50 95 Z',gold),
  gamer: human('#82583f',purple,'curl',line('M17 53 V40 Q18 12 50 12 Q82 12 83 40 V53')+rect(15,42,12,24,5,mint)+rect(73,42,12,24,5,mint)+line('M79 63 Q79 76 58 74')+rect(53,71,10,6,3,mint)),
  runner: human('#a46b4c',mint,'bun',shape('M24 35 Q50 29 77 35 V43 Q50 37 24 43 Z','#fff4dc')+shape('M50 39 L56 34 L60 40 L54 45 Z',gold)+shape('M34 78 L42 100 M66 78 L58 100','none')+rect(42,91,16,10,2,'#fff4dc')),
  chef: human('#e8b895','#fff4dc','crop',shape('M24 34 V25 Q12 19 20 10 Q26 3 35 10 Q41 -1 50 5 Q62 0 68 10 Q81 3 86 15 Q89 25 77 28 V35 Z','#fffaf0')+rect(24,30,53,10,2,'#fffaf0')+shape('M36 79 L50 89 L64 79 L59 96 H41 Z','#db7067')+circle(64,94,2.5,ink)),
  artist: human('#bd815c','#e7aa6e','swoop',shape('M18 31 Q21 8 53 9 Q80 9 84 31 L66 36 H29 Z','#db7067')+rect(26,31,49,8,3,'#db7067')+shape('M49 10 L53 4 L57 10','#db7067')+shape('M72 93 L83 59 L89 61 L78 95 Z',gold)+shape('M83 59 Q78 46 88 44 Q96 50 89 61 Z',purple)+circle(31,89,4,mint)),
  swordsman: sword(15)+human('#c68b62',purple,'crop',shape('M24 34 L31 21 L50 30 L69 21 L76 34 L69 44 L50 37 L31 44 Z','#dbe6e8')+gem(50,34,gold)+shape('M29 86 L50 94 L71 86 L64 102 H36 Z','#dbe6e8')),
  dualblade: sword(12)+sword(88,true)+human('#855b43',mint,'silver',shape('M26 40 Q50 30 74 40 L72 48 Q50 39 28 48 Z',gold)+shape('M28 85 L68 100 M72 85 L32 100','none')),
  energy: shape('M17 75 L8 54 L19 42 L14 20 L31 34 M83 75 L92 54 L81 42 L86 20 L69 34',gold)+human('#b67e5c',purple,'swoop',shape('M26 35 L30 22 L38 34 L47 14 L57 32 L73 24 L74 40',purple)+gem(50,35,mint)+shape('M32 90 L50 80 L68 90 L50 103 Z',mint)),
  bazooka: shape('M17 104 V87 Q17 77 30 77 H70 Q83 77 83 87 V104 Z',purple)+rect(8,76,84,17,7,mint)+rect(75,72,18,25,5,'#c0dbe0')+circle(84,84,5,ink)+rect(23,22,54,53,15,'#c0dbe0')+rect(17,41,7,21,3,gold)+rect(76,41,7,21,3,gold)+rect(31,35,38,22,7,ink)+circle(40,46,4,gold)+circle(60,46,4,gold)+smile(63)+shape('M41 22 L50 9 L59 22',purple)+gem(50,18,gold),
};
await mkdir(new URL('../public/avatars/',import.meta.url),{recursive:true});
await mkdir(new URL('../public/characters/heads/',import.meta.url),{recursive:true});
for (const [id, body] of Object.entries(art)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g stroke="${ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
  await writeFile(new URL(`../public/avatars/${id}.svg`,import.meta.url),svg);
  // Derive the exact original face without the profile icon's cropped shirt.
  // A fresh full-body costume supplies the torso, so collars aren't duplicated.
  let head = body.replace(/<path d="M([\d.]+) ([\d.]+)[^"]*" fill="[^"]*"\/>/g, (tag, x, y) => Number(y) >= 77 && !(id === 'phoenix' && Number(x) === 22) ? '' : tag);
  head = head.replace(/<rect x="[^"]*" y="([\d.]+)"[^>]*\/>/g, (tag, y) => Number(y) >= 75 ? '' : tag);
  head = head.replace(/<circle cx="[^"]*" cy="([\d.]+)"[^>]*\/>/g, (tag, y) => Number(y) >= 77 ? '' : tag);
  if (id === 'swordsman') head = head.replace(sword(15), '');
  if (id === 'dualblade') head = head.replace(sword(12), '').replace(sword(88, true), '');
  if (id === 'artist') head = head.replace(shape('M83 59 Q78 46 88 44 Q96 50 89 61 Z',purple), '');
  const headSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g stroke="${ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${head}</g></svg>\n`;
  await writeFile(new URL(`../public/characters/heads/${id}.svg`,import.meta.url),headSvg);
}
console.log(`Created ${Object.keys(art).length} original SVG avatars and matching character heads.`);

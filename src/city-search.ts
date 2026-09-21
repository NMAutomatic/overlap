// Match either IANA spelling without replacing the browser's supported zone ID.
const groups: { zones: string[]; names: string[] }[] = [
  { zones: ['America/New_York'], names: ['NYC', 'New York City', '纽约', '紐約'] },
  { zones: ['America/Los_Angeles'], names: ['LA', 'Los Angeles', '洛杉矶', '洛杉磯'] },
  { zones: ['America/Toronto'], names: ['多伦多', '多倫多'] },
  { zones: ['America/Vancouver'], names: ['温哥华', '溫哥華'] },
  { zones: ['Europe/London'], names: ['伦敦', '倫敦'] },
  { zones: ['Europe/Paris'], names: ['巴黎'] },
  { zones: ['Europe/Berlin'], names: ['柏林'] },
  { zones: ['Europe/Kyiv', 'Europe/Kiev'], names: ['Kyiv', 'Kiev'] },
  { zones: ['Asia/Kolkata', 'Asia/Calcutta'], names: ['Kolkata', 'Calcutta', '加尔各答'] },
  { zones: ['Asia/Kathmandu', 'Asia/Katmandu'], names: ['Kathmandu', 'Katmandu', '加德满都'] },
  { zones: ['Asia/Shanghai'], names: ['上海'] },
  { zones: ['Asia/Hong_Kong'], names: ['Hong Kong', '香港'] },
  { zones: ['Asia/Tokyo'], names: ['东京', '東京'] },
  { zones: ['Asia/Seoul'], names: ['首尔', '首爾'] },
  { zones: ['Asia/Singapore'], names: ['新加坡'] },
  { zones: ['Australia/Sydney'], names: ['悉尼'] },
  { zones: ['Pacific/Auckland'], names: ['奥克兰', '奧克蘭'] },
];

const normalize = (value: string) => value.normalize('NFKD').toLowerCase()
  .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');

/** Search names, aliases and IANA paths; prefer exact names over broad regions. */
export function searchZones(zones: string[], query: string, excluded: string[] = []): string[] {
  const needle = normalize(query);
  if (query.trim() && !needle) return [];
  const selected = new Set(excluded);
  // If a browser exposes both spellings, selecting one excludes its equivalent.
  for (const group of groups) {
    if (group.zones.some(zone => selected.has(zone))) group.zones.forEach(zone => selected.add(zone));
  }
  return zones.filter(zone => !selected.has(zone)).map((zone, index) => {
    const names = [zone.split('/').at(-1)!, ...(groups.find(group => group.zones.includes(zone))?.names ?? [])].map(normalize);
    const score = !needle ? 0 : names.includes(needle) ? 0
      : names.some(name => name.startsWith(needle)) ? 1
      : names.some(name => name.includes(needle)) || normalize(zone).includes(needle) ? 2 : 3;
    return { zone, score, index };
  }).filter(result => result.score < 3)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, 40).map(result => result.zone);
}

export function multiplayerEndpoint(configured: string | undefined, page: Pick<Location, 'protocol' | 'host'>, development: boolean): string {
  if (!configured?.trim()) {
    if (development) return `${page.protocol === 'https:' ? 'wss:' : 'ws:'}//${page.host}/socket`;
    throw new Error('Multiplayer is not configured. Set VITE_MULTIPLAYER_URL and redeploy the frontend.');
  }
  const url = new URL(configured.trim());
  if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || (page.protocol === 'https:' && url.protocol !== 'wss:')) {
    throw new Error('The multiplayer server URL is invalid. Use a secure wss:// endpoint.');
  }
  return url.href;
}

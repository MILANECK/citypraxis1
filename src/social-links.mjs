export function normalizeSocialLinks(items) {
  if (!Array.isArray(items) || items.length > 2) throw new Error('Invalid social links');
  const seen = new Set();
  return items.map(item => {
    const platform = String(item?.platform || '').toLowerCase();
    const host = platform === 'instagram' ? 'instagram.com' : platform === 'facebook' ? 'facebook.com' : '';
    if (!host || seen.has(platform)) throw new Error('Invalid social platform');
    const url = new URL(String(item?.url || ''));
    if (url.protocol !== 'https:' || ![host, `www.${host}`, ...(platform === 'facebook' ? ['m.facebook.com'] : [])].includes(url.hostname) || !url.pathname || url.pathname === '/') throw new Error('Invalid social URL');
    seen.add(platform);
    return { platform, url: url.href };
  });
}

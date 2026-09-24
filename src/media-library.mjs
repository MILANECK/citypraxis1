import { extname } from 'node:path';

export function mediaInUse(path, rows) {
  const contains = value => {
    if (value === path) return true;
    if (Array.isArray(value)) return value.some(contains);
    if (value && typeof value === 'object') return Object.values(value).some(contains);
    return false;
  };
  return rows.some(row => [row.draft, row.published].some(value => {
    if (typeof value === 'string') {
      try { return contains(JSON.parse(value)); } catch { return false; }
    }
    return contains(value);
  }));
}

export function mediaDownloadName(media) {
  const id=String(media.id||'file').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80)||'file';
  const extension=extname(new URL(media.path,'http://localhost').pathname).toLowerCase();
  return `citypraxis-${id}${/^\.(png|jpe?g|webp|mp4)$/.test(extension)?extension:''}`;
}

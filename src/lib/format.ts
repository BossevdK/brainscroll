export function flagEmoji(iso2: string): string {
  return String.fromCodePoint(
    ...iso2.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

function trimZero(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

/** 1450000000 -> "1.45 billion", 18000000 -> "18 million", 39000 -> "39,000" */
export function compactNumber(n: number): string {
  if (n >= 1e9) return `${trimZero(n / 1e9, 2)} billion`;
  if (n >= 1e6) return `${trimZero(n / 1e6, n >= 1e8 ? 0 : 1)} million`;
  if (n >= 100) return Math.round(n).toLocaleString('en-US');
  if (n >= 10) return trimZero(n, 1);
  return trimZero(n, 2);
}

export function ratioText(big: number, small: number): string {
  const r = big / small;
  if (r >= 10) return `${Math.round(r).toLocaleString('en-US')}×`;
  return `${trimZero(r, 1)}×`;
}

/** Wikipedia article title → URL; full URLs pass through. */
export function sourceUrl(source: string): string {
  return /^https?:\/\//.test(source) ? source : `https://en.wikipedia.org/wiki/${encodeURIComponent(source)}`;
}

/** Where new versions are published (GitHub releases, tag "vX.Y", file "Brainscroll.apk"). */
export const REPO = 'BossevdK/brainscroll';
export const APK_NAME = 'Brainscroll.apk';

export type Release = { version: string; tag: string; notes: string; apkUrl: string; pageUrl: string };

/** "v1.2" / "1.2.0" → [1, 2, 0]. */
export function parseVersion(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((p) => parseInt(p, 10) || 0);
}

/** > 0 when a is newer than b. "1.1" equals "1.1.0". */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

type GitHubRelease = {
  tag_name?: string;
  body?: string | null;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name: string; browser_download_url: string }[];
};

/** Turns the GitHub API answer into a Release, or null when it has no APK. */
export function toRelease(json: GitHubRelease): Release | null {
  if (!json.tag_name || json.draft || json.prerelease) return null;
  const apk = json.assets?.find((a) => a.name === APK_NAME) ?? json.assets?.find((a) => a.name.endsWith('.apk'));
  if (!apk) return null;
  return {
    version: json.tag_name.replace(/^v/i, ''),
    tag: json.tag_name,
    notes: (json.body ?? '').trim().slice(0, 600),
    apkUrl: apk.browser_download_url,
    pageUrl: json.html_url ?? `https://github.com/${REPO}/releases/latest`,
  };
}

/** The newest release, if it is newer than the version you have. Never throws. */
export async function checkForUpdate(current: string): Promise<Release | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Brainscroll-app' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const release = toRelease(await res.json());
    return release && compareVersions(release.version, current) > 0 ? release : null;
  } catch {
    return null;
  }
}

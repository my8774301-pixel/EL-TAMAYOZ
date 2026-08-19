/**
 * Client-side hardening helpers.
 * NOTE: real security lives in Supabase (RLS policies in supabase/schema.sql).
 * These helpers only reduce the attack surface of the UI layer.
 */

/** Strip control chars / angle brackets so nothing user-typed can be treated as markup. */
export function clean(input: string, max = 200): string {
  return input
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

export function isValidUsername(u: string): boolean {
  return /^[a-zA-Z0-9._-]{4,24}$/.test(u);
}

export function passwordProblem(p: string): string | null {
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return "Password must contain letters and numbers.";
  if (/^(password|12345678|qwertyui)/i.test(p)) return "Password is too common.";
  return null;
}

export function isValidPhone(p: string): boolean {
  return /^0\d{9,11}$/.test(p.replace(/\s+/g, ""));
}

export function isValidFullName(n: string): boolean {
  return n.trim().split(/\s+/).length >= 3 && n.trim().length <= 80;
}

/** Only allow embeds from known, free providers. Blocks javascript:/data: URLs. */
const ALLOWED_LIVE_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "meet.google.com",
  "zoom.us",
  "us02web.zoom.us",
  "us04web.zoom.us",
  "teams.microsoft.com",
];

export function normalizeLiveLink(raw: string): { ok: boolean; url?: string; embed?: string } {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return { ok: false };
    if (!ALLOWED_LIVE_HOSTS.includes(u.hostname)) return { ok: false };
    let embed: string | undefined;
    if (u.hostname.endsWith("youtube.com") && u.searchParams.get("v")) {
      embed = `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    } else if (u.hostname === "youtu.be") {
      embed = `https://www.youtube.com/embed${u.pathname}`;
    } else if (u.hostname.endsWith("youtube.com") && u.pathname.startsWith("/live/")) {
      embed = `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
    }
    return { ok: true, url: u.toString(), embed };
  } catch {
    return { ok: false };
  }
}

/** Simple in-memory throttle to slow down brute-force attempts from this browser. */
const attempts = new Map<string, { n: number; until: number }>();

export function throttle(key: string, limit = 5, windowMs = 60_000): string | null {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.until) {
    attempts.set(key, { n: 1, until: now + windowMs });
    return null;
  }
  rec.n += 1;
  if (rec.n > limit) {
    return `Too many attempts. Try again in ${Math.ceil((rec.until - now) / 1000)}s.`;
  }
  return null;
}

export function resetThrottle(key: string) {
  attempts.delete(key);
}

/** Username -> internal auth email (Supabase Auth requires an email identifier). */
export const AUTH_DOMAIN = "tamayoz.local";
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase("محمد مرجان")}@${AUTH_DOMAIN}`;
}

/** Fixed teacher credentials mapping (teacher account is seeded in Supabase). */
export const TEACHER_USERNAME_AR = "محمد مرجان";
export const TEACHER_EMAIL = `teacher@${AUTH_DOMAIN}`;

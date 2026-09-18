/**
 * Turn a pasted link into something a card can play inline.
 *
 * Only hosts with a stable, documented embed URL are recognised. Anything
 * else stays a plain link, which is always a safe fallback: a wrong guess at
 * an embed format shows an error frame, a link just works.
 */
export type Embed =
  | { kind: "iframe"; src: string; provider: string }
  | { kind: "twitch"; clip: string }
  | { kind: "video"; src: string }
  | { kind: "image"; src: string }
  | { kind: "link"; href: string };

const VIDEO_FILE = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|avif)$/i;

/** YouTube's t= comes as 90, 90s or 1m30s. The embed wants plain seconds. */
function seconds(raw: string | null): number {
  if (!raw) return 0;
  if (/^\d+s?$/.test(raw)) return parseInt(raw, 10);
  const m = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0));
}

export function toEmbed(raw: string): Embed {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: "link", href: raw };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { kind: "link", href: raw };
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  // YouTube: watch?v=, youtu.be/, shorts/, embed/
  let yt: string | null = null;
  if (host === "youtu.be") yt = parts[0] ?? null;
  else if (host === "youtube.com" || host === "music.youtube.com") {
    if (parts[0] === "watch") yt = url.searchParams.get("v");
    else if (["shorts", "embed", "live"].includes(parts[0])) yt = parts[1] ?? null;
  }
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    const start = seconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
    // The nocookie domain plays the same video without tracking viewers who
    // never press play.
    return {
      kind: "iframe",
      provider: "YouTube",
      src: `https://www.youtube-nocookie.com/embed/${yt}${start ? `?start=${start}` : ""}`,
    };
  }

  // Streamable: streamable.com/abc123
  if (host === "streamable.com" && parts[0] && /^\w+$/.test(parts[0])) {
    const id = parts[0] === "e" ? parts[1] : parts[0];
    if (id) {
      return { kind: "iframe", provider: "Streamable", src: `https://streamable.com/e/${id}` };
    }
  }

  // Twitch clips: clips.twitch.tv/Slug or twitch.tv/channel/clip/Slug.
  // The embed needs the page's own hostname, so it is built in the browser.
  if (host === "clips.twitch.tv" && parts[0]) {
    return { kind: "twitch", clip: parts[0] };
  }
  if (host === "twitch.tv" && parts[1] === "clip" && parts[2]) {
    return { kind: "twitch", clip: parts[2] };
  }

  if (VIDEO_FILE.test(url.pathname)) return { kind: "video", src: url.href };
  if (IMAGE_FILE.test(url.pathname)) return { kind: "image", src: url.href };

  return { kind: "link", href: url.href };
}

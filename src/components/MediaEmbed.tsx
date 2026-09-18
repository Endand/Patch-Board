"use client";

import { useSyncExternalStore } from "react";
import { toEmbed } from "@/lib/embed";

const noop = () => () => {};

/** Twitch refuses to play unless told which site it is embedded on. */
function useHostname(): string {
  return useSyncExternalStore(
    noop,
    () => window.location.hostname,
    () => "",
  );
}

export function MediaEmbed({ url }: { url: string }) {
  const embed = toEmbed(url);
  const hostname = useHostname();

  const frame = (src: string, title: string) => (
    <div className="mt-3 aspect-video w-full max-w-full overflow-hidden rounded-lg border border-edge bg-black">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full"
      />
    </div>
  );

  switch (embed.kind) {
    case "iframe":
      return frame(embed.src, `${embed.provider} clip`);

    case "twitch":
      // Rendered only once the hostname is known, so the server and the
      // first client render agree.
      return hostname
        ? frame(
            `https://clips.twitch.tv/embed?clip=${encodeURIComponent(embed.clip)}&parent=${hostname}&autoplay=false`,
            "Twitch clip",
          )
        : null;

    case "video":
      return (
        <video
          src={embed.src}
          controls
          preload="metadata"
          className="mt-3 aspect-video w-full max-w-full rounded-lg border border-edge bg-black"
        />
      );

    case "image":
      return (
        <a href={embed.src} target="_blank" rel="noopener noreferrer nofollow">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts, which next/image would need listing in config */}
          <img
            src={embed.src}
            alt="Attached screenshot"
            loading="lazy"
            className="mt-3 max-h-96 max-w-full rounded-lg border border-edge"
          />
        </a>
      );

    default:
      return (
        <a
          href={embed.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-block text-sm underline underline-offset-2"
        >
          Attached link
        </a>
      );
  }
}

/**
 * The mark is a board: three stacked cards with the left edge coloured, the
 * same shape the feedback cards use throughout the app.
 */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="6"
        fill="var(--accent-soft)"
        stroke="var(--accent)"
        strokeOpacity="0.35"
      />
      <rect x="5.5" y="6" width="13" height="3.4" rx="1.2" fill="var(--praise)" />
      <rect
        x="5.5"
        y="10.3"
        width="13"
        height="3.4"
        rx="1.2"
        fill="var(--balance)"
      />
      <rect x="5.5" y="14.6" width="13" height="3.4" rx="1.2" fill="var(--bug)" />
    </svg>
  );
}

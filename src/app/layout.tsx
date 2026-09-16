import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeToggle, THEME_SCRIPT } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/Logo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Patch Board",
    template: "%s · Patch Board",
  },
  description:
    "Structured, colour coded feedback boards. Anyone can post, no account needed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* Sets the theme attribute before hydration, so a chosen theme never
            flashes the other way on load. */}
        <Script id="pb-theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>

        <header className="sticky top-0 z-30 border-b border-edge bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold tracking-tight"
            >
              <Logo />
              <span className="hidden sm:inline">Patch Board</span>
            </Link>
            <nav className="ml-auto flex items-center gap-3 sm:gap-4">
              <Link
                href="/new"
                className="whitespace-nowrap text-sm text-muted transition hover:text-foreground"
              >
                New board
              </Link>
              <AccountMenu />
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-edge">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-6 text-xs text-muted sm:px-6">
            <span className="flex items-center gap-1.5">
              <Logo size={16} />
              Patch Board
            </span>
            <span aria-hidden>·</span>
            <span>Feedback boards that anyone can post to.</span>
            <a
              href="https://github.com/Endand/Patch-Board"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto transition hover:text-foreground"
            >
              Source
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

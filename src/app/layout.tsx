import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeToggle, THEME_SCRIPT } from "@/components/ThemeToggle";
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
  title: "Patch Board",
  description: "Structured, colour coded feedback boards. No account needed.",
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
            flashes the other way on load. A raw <script> element would warn
            here, next/script injects it into the initial HTML instead. */}
        <Script id="pb-theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <header className="border-b border-edge">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3">
            <Link href="/" className="font-medium tracking-tight">
              Patch Board
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/new"
                className="text-sm text-muted transition hover:text-foreground"
              >
                New board
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700"],
  variable: "--font-playfair",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "AI R&A Submissions",
  description: "AI-powered Review & Approval platform for Alyssa Nobriga International",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable}`}>
      <body className="min-h-screen bg-cream font-sans text-navy">
        <header className="border-b border-navy/10 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
            <span className="font-serif text-2xl">
              <span className="italic text-gold">AI R&amp;A</span>{" "}
              <span className="font-semibold uppercase tracking-wide text-navy">Submissions</span>
            </span>
            <span className="font-sans text-xs uppercase tracking-widest text-gold">
              Alyssa Nobriga International
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}

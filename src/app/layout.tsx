import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team KB",
  description: "Simplified knowledge base for internal teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {/* First tab stop on every page (design §7.2). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-base focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main
          id="main"
          className="mx-auto w-full max-w-page flex-1 px-4 py-6 md:px-6"
        >
          {children}
        </main>
      </body>
    </html>
  );
}

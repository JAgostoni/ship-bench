import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: {
    default: "Knowledge Base",
    template: "%s — Knowledge Base",
  },
  description: "Internal knowledge base for team documentation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { articles: true } } },
  });

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[var(--z-skip-link)] focus:px-4 focus:py-2 focus:bg-white focus:text-neutral-900 focus:rounded-md focus:shadow-md focus:ring-2 focus:ring-neutral-500"
        >
          Skip to content
        </a>
        <AppShell categories={categories}>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Knowledge Base",
    template: "%s · Knowledge Base",
  },
  description: "Internal team knowledge base — browse, search, and edit documentation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <AppHeader />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

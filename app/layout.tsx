// app/layout.tsx
// WHAT IT'S FOR: the frame around every page: the <html> and <body> tags, the shared styles, and
// the header bar across the top.
// WHO USES IT: Next.js wraps every page in it automatically.
// WHY THE NAME: "layout.tsx" is the Next.js name for a shared layout; ".tsx" = screen code.

import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Weekly Digest",
  description: "A weekly review of a barbershop's appointments, for the owner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

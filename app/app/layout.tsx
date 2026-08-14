import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null },
};

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return children;
}

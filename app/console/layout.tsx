import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kayd Console",
  robots: { index: false, follow: false },
};

export default function ConsoleRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

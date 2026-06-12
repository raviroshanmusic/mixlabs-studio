import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MixLabs Studio OS",
  description: "Post production, composed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

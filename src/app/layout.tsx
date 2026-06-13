import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MixLabs Studio OS",
  description: "Post production, composed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",   // enables env(safe-area-inset-bottom) in Safari
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Apply saved theme before first paint — only on authenticated app routes */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ml-theme');var p=window.location.pathname;var isApp=/^\/(dashboard|project|review|member)/.test(p);if(t==='light'&&isApp)document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

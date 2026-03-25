import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Innovation Playbook Platform — MASCI ISO 56001",
  description: "Platform สำหรับ Workshop ISO 56001 Innovation Management System",
};

// Script to handle GitHub Pages SPA redirect (decode ?p=/path back to real route)
const spaRedirectScript = `
(function(l) {
  if (l.search[1] === '/') {
    var decoded = l.search.slice(1).split('&').map(function(s) {
      return s.replace(/~and~/g, '&');
    });
    window.history.replaceState(null, null,
      decoded.shift() +
      (decoded.length ? '?' + decoded.join('&') : '') +
      l.hash
    );
  }
}(window.location));
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        {/* GitHub Pages SPA routing: decode redirect from 404.html */}
        <script dangerouslySetInnerHTML={{ __html: spaRedirectScript }} />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

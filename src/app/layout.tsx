import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospection LinkedIn",
  description: "SaaS d'automatisation de la prospection LinkedIn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
        <body className="antialiased" style={{ margin: 0, minHeight: "100vh", background: "#0A0A0B", color: "#FAFAFA" }}>
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            Activez JavaScript pour utiliser cette application.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nicopel & The Best Açaí | Rastreio Campanha de Inverno",
  description: "Consulte suas Notas Fiscais de Potes da Copa e Embalagens Waffle da The Best Açaí e rastreie suas entregas.",
  keywords: ["The Best Açaí", "Nicopel Embalagens", "Rastreio", "Potes da Copa", "Campanha de Inverno"],
  authors: [{ name: "The Best Açaí & Nicopel" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col font-sans bg-zinc-950 text-zinc-100 selection:bg-brand-purple/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}

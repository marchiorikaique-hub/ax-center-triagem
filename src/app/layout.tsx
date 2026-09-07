import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@fontsource-variable/mona-sans"; // fonte do GitHub, para os títulos
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Triagem de Ocorrências de Campo",
  description: "Painel da operação: pergunte à base e veja o que precisa de atenção hoje.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triagem de Ocorrências — AX Center",
  description: "Painel de triagem e detecção de falha sistêmica sobre a base de ocorrências de campo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A base de ocorrências é lida do disco em runtime (server-side).
  // Nada de banco: o CSV é a fonte, o que mantém o projeto reproduzível.
};

export default nextConfig;

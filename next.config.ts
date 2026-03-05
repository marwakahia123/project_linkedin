import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permet l'accès via ngrok pour partager le lien sans déploiement
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"],
};

export default nextConfig;

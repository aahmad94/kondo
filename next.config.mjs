/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Turbopack is enabled by default in Next 16.
  // An empty config silences the legacy-webpack-config warning and
  // is sufficient because Turbopack auto-handles Node.js built-in
  // fallbacks (fs, path, etc.) for browser bundles.
  turbopack: {},
};

export default nextConfig;

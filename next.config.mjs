/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  experimental: {
    esmExternals: true
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  }
};

export default nextConfig;

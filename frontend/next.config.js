/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty");
    return config;
  },
  reactStrictMode: false,
};

module.exports = nextConfig;

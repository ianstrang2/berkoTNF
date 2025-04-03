/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove appDir which is deprecated in Next.js 13.4+
  experimental: {
    // Removed appDir option which is now enabled by default
    // Other experimental features as needed
  },
  // Add this to help with module resolution
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
  // Increase timeout for builds
  staticPageGenerationTimeout: 180,
  // Add any rewrites or redirects here as needed
};

export default nextConfig;
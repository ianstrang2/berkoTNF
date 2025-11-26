/** @type {import('next').NextConfig} */
const nextConfig = {
  // ===================================================================
  // STANDARD NEXT.JS CONFIGURATION
  // ===================================================================
  // This is a normal Next.js app that runs on Vercel with full API routes.
  // Mobile app (Capacitor) loads this app via webview - no static export.
  // ===================================================================
  
  // Disable image optimization for Capacitor (optional, improves compatibility)
  images: {
    unoptimized: process.env.CAPACITOR_BUILD === 'true' ? true : false,
  },
  
  // Webpack config for module resolution
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
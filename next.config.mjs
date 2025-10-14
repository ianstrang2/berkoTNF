/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove appDir which is deprecated in Next.js 13.4+
  experimental: {
    // Removed appDir option which is now enabled by default
    // Other experimental features as needed
  },
  
  // ===================================================================
  // CAPACITOR MOBILE BUILD CONFIGURATION
  // ===================================================================
  // Enable static export for Capacitor builds (exports to out/ directory)
  // API routes are NOT included in static export - mobile app calls them
  // via HTTPS to production server (https://app.caposport.com/api/*)
  // ===================================================================
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  
  // Disable image optimization for static export (Capacitor compatibility)
  images: {
    unoptimized: process.env.CAPACITOR_BUILD === 'true' ? true : false,
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
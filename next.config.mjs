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
  
  // ===================================================================
  // DOMAIN SEPARATION REDIRECTS
  // ===================================================================
  // Marketing: caposport.com (/, /privacy)
  // App: app.caposport.com (/admin/*, /player/*, /auth/*, etc.)
  //
  // These redirects send app routes to the app subdomain when accessed
  // from the root marketing domain. This ensures auth cookies work correctly.
  // ===================================================================
  async redirects() {
    return [
      // Admin routes → app subdomain
      {
        source: '/admin/:path*',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/admin/:path*',
        permanent: true,
      },
      // Player routes → app subdomain
      {
        source: '/player/:path*',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/player/:path*',
        permanent: true,
      },
      // Auth routes → app subdomain
      {
        source: '/auth/:path*',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/auth/:path*',
        permanent: true,
      },
      // Join routes → app subdomain
      {
        source: '/join/:path*',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/join/:path*',
        permanent: true,
      },
      // Signup routes → app subdomain
      {
        source: '/signup/:path*',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/signup/:path*',
        permanent: true,
      },
      // Superadmin routes → app subdomain
      {
        source: '/superadmin/:path*',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/superadmin/:path*',
        permanent: true,
      },
      // Open (universal entry) → app subdomain
      {
        source: '/open',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/open',
        permanent: true,
      },
      // Unauthorized → app subdomain
      {
        source: '/unauthorized',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/unauthorized',
        permanent: true,
      },
      // API routes → app subdomain (for any direct API calls from root domain)
      {
        source: '/api/:path*',
        has: [{ type: 'host', value: 'caposport.com' }],
        destination: 'https://app.caposport.com/api/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
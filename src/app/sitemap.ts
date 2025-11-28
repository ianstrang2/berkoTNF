import { MetadataRoute } from 'next';

/**
 * Next.js Sitemap Generator
 * 
 * This file is automatically picked up by Next.js and served at /sitemap.xml
 * 
 * To update the BASE_URL, change the constant below.
 * The sitemap regenerates automatically on every build.
 * 
 * Documentation: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

const BASE_URL = 'https://caposport.com';

export default function sitemap(): MetadataRoute.Sitemap {
  // Define all public marketing pages that should be indexed
  const marketingRoutes = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    // Add more marketing pages here as you create them:
    // {
    //   url: `${BASE_URL}/pricing`,
    //   lastModified: new Date(),
    //   changeFrequency: 'weekly' as const,
    //   priority: 0.8,
    // },
    // {
    //   url: `${BASE_URL}/about`,
    //   lastModified: new Date(),
    //   changeFrequency: 'monthly' as const,
    //   priority: 0.7,
    // },
  ];

  return marketingRoutes;
}


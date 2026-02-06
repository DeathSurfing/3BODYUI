import type { NextConfig } from "next";

/**
 * Next.js configuration for Tauri v2 integration
 * 
 * This configuration enables static site generation (SSG) which is required
 * for Tauri to bundle the frontend into a native application. Tauri does not
 * support server-side rendering (SSR) as it bundles static HTML/CSS/JS files.
 * 
 * @see https://v2.tauri.app/start/frontend/nextjs/
 */

const internalHost = process.env.TAURI_DEV_HOST || 'localhost';
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  /**
   * Enable static HTML export
   * This is REQUIRED for Tauri - generates static files instead of SSR
   */
  output: 'export',
  
  /**
   * Output directory for static files
   * Tauri's frontendDist in tauri.conf.json should point to this directory
   */
  distDir: 'dist',
  
  /**
   * Image optimization configuration
   * unoptimized: true is required for static export
   * The Image component will work but won't optimize images at build time
   * 
   * @see https://nextjs.org/docs/messages/export-image-api
   */
  images: {
    unoptimized: true,
  },
  
  /**
   * Asset prefix configuration
   * In development with Tauri mobile, we need to serve from the dev server
   * TAURI_DEV_HOST is set by Tauri CLI when running on mobile devices
   */
  assetPrefix: isProd 
    ? undefined 
    : process.env.TAURI_DEV_HOST 
      ? `http://${process.env.TAURI_DEV_HOST}:3000`
      : undefined,
  
  /**
   * Trailing slash configuration
   * Ensures consistent routing in static export
   */
  trailingSlash: true,
  
  /**
   * Disable x-powered-by header for security
   */
  poweredByHeader: false,
};

export default nextConfig;

import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
};

const sentryWebpackPluginOptions = {
  /**
   * For all available options, see:
   * https://github.com/getsentry/sentry-webpack-plugin#options
   */

  // Auth token for uploading source maps to Sentry.
  // Set SENTRY_AUTH_TOKEN in your CI / Vercel env vars.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Your Sentry org slug (from sentry.io → Settings → Organization)
  org: process.env.SENTRY_ORG,

  // Your Sentry project slug
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI/production; skip locally to speed up builds.
  silent: process.env.NODE_ENV !== "production",

  // Disable source-map upload when running locally without a token
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,

  // Automatically instrument Next.js 15 Server Actions
  autoInstrumentServerFunctions: true,

  // Tunnel Sentry requests through our own domain (avoids ad-blocker drops)
  tunnelRoute: "/monitoring-tunnel",

  // Hide Sentry source-map comment from final bundle
  hideSourceMaps: true,

  // Enable tree-shaking for Sentry to reduce bundle size
  disableLogger: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);

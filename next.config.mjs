/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export (SPEC.md §2.2, PROJECT_PLAN_MULTISTATE.md hosting decision):
  // zero backend, all data is pre-built JSON served from /public/data/, so
  // there's nothing here that needs a Node server at request time. Requires
  // generateStaticParams on every dynamic route segment (see app/[state]/
  // layout.tsx and the four arbitrary-id routes' page.tsx files) plus
  // staticwebapp.config.json for the Azure Static Web Apps rewrite/fallback
  // rules those placeholder shells depend on.
  //
  // Applied only for `next build`: `next dev` strictly enforces that every
  // dynamic param visited exists in generateStaticParams() when output:export
  // is set, which breaks navigation to arbitrary entity/workspace ids in dev.
  // Production behavior is unchanged.
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  // Allows direct JSON imports (used for public/data/*.json in server components)
  // Runtime data loading still uses fetch('/data/...') on the client
  eslint: {
    // eslint is not installed as a devDependency in this repo; avoid next build
    // hanging on the interactive "set up ESLint" prompt during CI/verification runs.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

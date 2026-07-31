/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily disabled: the current dynamic [state] route tree is not
  // compatible with `output: 'export'` during `next build`, and the
  // route-level `generateStaticParams()` workaround still hits the same
  // static-export prerendering failure. Keeping the app on the normal
  // Next production build path avoids that dead-end while preserving the
  // existing runtime data model.
  eslint: {
    // eslint is not installed as a devDependency in this repo; avoid next build
    // hanging on the interactive "set up ESLint" prompt during CI/verification runs.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

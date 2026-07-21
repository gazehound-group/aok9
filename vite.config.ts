import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

/**
 * Short commit the build came from, shown in the footer so a reported problem
 * can be traced to exact code. Cloudflare Pages sets CF_PAGES_COMMIT_SHA on
 * every deploy; locally we ask git; a bare source copy reports "dev".
 */
function buildSha(): string {
  const fromPages = process.env.CF_PAGES_COMMIT_SHA;
  if (fromPages) return fromPages.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha()),
  },
});

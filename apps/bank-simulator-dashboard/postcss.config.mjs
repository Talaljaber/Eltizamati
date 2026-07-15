/**
 * Without this, Next's config search walks up past the repo root and can
 * pick up an unrelated stray `postcss.config.js` outside the repository —
 * this file stops that search here with a minimal, valid config.
 */
export default {
  plugins: {},
}

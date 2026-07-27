const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // next.config.js runs directly in Node (never webpack-bundled), so __dirname here is always
  // this project's real directory — unlike inside app/ code, where webpack's RSC bundling
  // rewrites `require.resolve`/relative `__dirname` tricks into fake module ids. Route uploads
  // through this instead of computing the path anywhere else.
  env: {
    UPLOAD_DIR: path.join(__dirname, "public", "uploads"),
  },
};

module.exports = nextConfig;

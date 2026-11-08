#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules/ws ]; then npm install; fi
if [ ! -f public/assets/character.glb ]; then npm run fetch:models || true; fi
printf '\nOpen http://localhost:3000 in your browser\n'
exec node server.mjs

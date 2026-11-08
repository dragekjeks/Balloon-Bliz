# Original Meshy 3D game assets

These four original 3D models were generated on the user's connected Meshy account on November 8, 2026. The server/client is wired to load the real GLB files, when placed in `public/assets/` under the exact filenames shown.

| File | Model description | Meshy task ID |
| --- | --- | --- |
| `character.glb` | Glossy red/yellow balloon-person (previously generated on user's Meshy account) | `01a1bb88-b3be-77e5-8eb1-8d4884cc946a` |
| `blaster.glb` | Candy-colored twist-balloon blaster | `01a1bb8d-aafa-752c-bb48-b07c6af544ad` |
| `cactus.glb` | Green inflated balloon cactus | `01a1bb8d-bdcd-76fb-8420-8f692e642c14` |
| `barricade.glb` | Stack of colorful inflatable balloon cover | `01a1bb8d-ca9b-72a2-90d9-7299dda3818c` |

## Import

1. Run `npm run fetch:models` before **November 10, 2026**, while temporary Meshy download URLs are still valid. The first download is saved permanently to your local project.
2. If the temporary links have expired, open [Meshy](https://www.meshy.ai/), find the models using their task IDs or creation timestamps, and download each as **GLB**. Rename and copy into `public/assets/`.
3. Refresh the game page. The Meshy geometry and textures replace the built-in balloon mesh equivalents automatically.

The browser game works immediately without these files because it includes custom procedural 3D balloon models as fallback. The download links themselves expire; never rely on signed Meshy URLs in production. The generated meshes are **not yet rigged**; remote players bob and rotate, but do not have walking skeletal animations.

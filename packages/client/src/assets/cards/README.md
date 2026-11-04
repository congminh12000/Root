# Ambush woodland backgrounds

Original generated artwork selected by the project owner on 2026-11-03 in Codex.
Created with the built-in imagegen tool, using the project indie woodland palette,
ink outlines, warm flat gouache shapes and subtle paper texture.
The owner requested this exact generated sheet be used for the Ambush backgrounds.

The sheet keeps its original 2172 × 724 size, re-encoded as WebP (quality 0.82) for load speed. Panels run left to right: bird, rabbit, fox,
mouse. `card-art.ts` selects panel viewBoxes excluding the cream gutters.
One shared image request serves all suits and both bird copies.
No official card scan is bundled. This is visual content only; rules text is unchanged.


# Ordinary craftable cards — original woodland character illustrations

Generated with the built-in imagegen tool on 2026-11-03 at the project owner's request.
45 physical craftable cards use 34 distinct paintings. Duplicate physical cards reuse their design's painting.
This artwork is original, with no official scans or traced game art.

- `woodland-bird.webp`: 8 scenes, final square unused.
- `woodland-fox.webp`: 9 scenes.
- `woodland-rabbit.webp`: 8 scenes, final square unused.
- `woodland-mouse.webp`: 9 scenes.

Each sheet keeps its original generated size of 1254×1254, a 3×3 grid with 418 px cells, re-encoded as WebP (quality 0.82): about 0.35 MB each instead of 3.3 MB PNG.
`ui/woodland-art.ts` lists each cell's design in row-major order and clips 3 px inside its edges.
SVG `preserveAspectRatio="none"` keeps the whole scene while filling the card from beneath the header to the bottom, including behind the compact text slip. Dedicated clipping keeps adjacent cells out.
Four shared local sheets work offline and require no runtime image generation.

Art direction: simple dark brown irregular ink outlines, warm flat gouache fills,
light paper grain, muted forest/ochre/terracotta/blue palette. One to three expressive
woodland characters in simple cloth clothing occupy most of each scene, with one
clear story action, minimal background, no text, frames, or card symbols in the painting.
Birds are armorers, traders, travelers, sappers and couriers; foxes are smiths,
merchants, tax collectors and travelers; rabbits are friends, bakers, bankers,
cobblers, commanders and smugglers; mice are scholars, craftsmen, merchants and scouts.

Card names, crafting conditions, effects, Ambush, Dominance and Quest are unchanged.


## Background depth revision — 2026-11-03

The owner requested soft backgrounds, a little depth, full-card paintings and removal of the olive bottom band.
The built-in imagegen editor used each existing sheet as reference, preserving the characters, actions and panel order,
and adding low-contrast distant trees, workshop details, ground vegetation, atmospheric light and contact shadows.
The revised output replaces each production sheet; original generations remain in the workspace's generated_images directory.
No hand-edited raster or official art was used. Updated originals remain exact 1254×1254 three-by-three sheets.

## Quest illustrations — 2026-11-04

Ten original indie woodland scenes generated with the built-in imagegen tool at
the owner's request. No official scans or traced artwork are included.
`quest-indie.webp` is one local 5-column × 2-row atlas, re-encoded as WebP.
The row-major mapping lives in `ui/quest-art.ts` (`QUEST_PANELS`):

1. Escort (mouse)
2. Errand (fox)
3. Errand (rabbit)
4. Fend off a Bear (rabbit)
5. Expel Bandits (mouse)
6. Expel Bandits (rabbit)
7. Give a Speech (rabbit)
8. Fundraising (fox)
9. Fend off a Bear (mouse)
10. Guard Duty (mouse)

Warm flat gouache, irregular brown ink, cream paper grain and soft woodland
backgrounds match the ordinary-card paintings. Each variant has its own scene;
characters are not mirrored. Paintings extend beneath the existing paper slip, preserving character proportions at both card sizes. SVG clips inset each panel to avoid neighbour bleed.
Five unlisted quests keep their procedural artwork. Items, suits, rewards and
accessible Vietnamese rules text are unchanged. All artwork works offline.

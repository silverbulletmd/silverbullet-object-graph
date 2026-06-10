# SilverBullet Object Graph

**This plug is now integrated into SilverBullet main line, therefore this repo is archived**


An interactive object-graph explorer for [SilverBullet](https://silverbullet.md). Visualizes the objects in your space — pages, items, blocks, and the typed relations between them — so you _can_ navigate by structure rather than by name.

## Features

* **`Graph: Explore`** (Ctrl/Cmd-Shift-G) — opens an exploratory graph anchored on the current page. Its 1-hop neighborhood loads immediately; expand outward by clicking the translucent (ghost) nodes.
* **`Graph: Global Page Map`** — loads every content page in the space at once, with mention edges between them. Toggle other relation labels in the sidebar to bring more edges in without a refetch.
* **Typed edges** sourced from SilverBullet's `relation` index — `mention`, `attribute`, `frontmatter`, `data`, `co-mention`, `url`, `document`. Hover an edge to see its label and the snippet of where it came from.
* **Filters** with full universe-of-the-space option lists:
  * Root tags (`page`, `item`, `task`, `block`, …)
  * User tags (auto-colored)
  * Relation labels (with counts from the explored set)
* **Object panel** in the sidebar — selected node's attributes rendered as YAML, with a click-to-navigate title and a remove button.
* **Double-click** any node to navigate; double-click an edge to jump to the exact `page@pos` where the relation is anchored.
* **Expand / Collapse** buttons in the header for batch ghost expansion and reset-to-anchor.
* **Hide labels** checkbox for dense graphs.
* Click-and-drag a node to pin it. Hover dims non-neighbors. Scroll/pinch to zoom; arrow keys / `+` `-` for keyboard control.

See [[ObjectGraph]] for the in-product documentation.

## Installation

Run the `Library: Install` command with:

```
ghr:silverbulletmd/silverbullet-object-graph@edge/ObjectGraph.md
```

## Requirements

SilverBullet ≥ 2.9 with the `relation` index. The graph view consumes `relation` objects exclusively — if your install doesn't have them yet (run `Space: Reindex` once after upgrading), the graph will show only the root node with no neighbors.

## Development

```sh
npm install
npm run build:deploy   # builds and copies the plug into demo-space/
```

Then start SilverBullet against `demo-space/`:

```sh
silverbullet ./demo-space -p 3456
```

Run `Plugs: Reload` in the running editor to pick up new bundles. See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for the architecture, build pipeline, and common gotchas.

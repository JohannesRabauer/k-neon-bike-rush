# Neon Bike Rush

A 2D physics-based motorcycle skill game with a **Tron: Legacy** neon aesthetic. Ride
across 100 procedurally-generated neon tracks, master 4 unique bikes, earn coins and
upgrade your machine. Pure HTML5 Canvas + JavaScript, powered by **Matter.js**.

## Features

- **100 levels** – gentle hills, ramps, gaps, jumps and full loop-the-loops that get
  harder as you climb the ladder (difficulty 1–10).
- **4 motorcycles** – Crimson Flash, Teal Storm, Violet Phantom and Solar Blaze, each
  drawn entirely on canvas with its own stats.
- **Upgrade shop** – spend coins on 5 levels of Acceleration, Top Speed, Braking, Jump
  and Grip per bike.
- **Neon rendering** – glowing terrain, particle exhaust, wheel trails, animated grid
  background and twinkling stars.
- **Full progress persistence** via `localStorage` (coins, upgrades, stars, unlocks).
- **Mobile-first** – responsive canvas plus on-screen touch buttons.

## Controls

| Action | Keyboard | Touch |
| ------ | -------- | ----- |
| Gas | `→` / `D` | green **GAS** button (bottom-right) |
| Brake / reverse | `←` / `A` | red **BRAKE** button (bottom-left) |
| Jump | `↑` / `W` | blue **↑** button |
| Lean back | `Z` / `Q` | ↺ button |
| Lean forward | `X` / `E` | ↻ button |
| Restart level | `R` | RESTART (HUD) |
| Back to menu | `Esc` | MENU (HUD) |

Flip the bike onto its body and you crash — land on your wheels!

## Run locally

No build step. Just serve the folder (a static server avoids browser module/CORS quirks):

```bash
# any static server works, e.g.
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000`. You can also open `index.html` directly.

## Project structure

```
index.html          Entry point + Matter.js CDN + touch overlay
css/style.css       Neon styling for canvas & touch UI
js/
  storage.js        localStorage save/load
  levels.js         Seeded procedural generation of all 100 levels
  bike.js           Bike definitions, stats, upgrades + canvas drawing
  engine.js         Matter.js physics wrapper (terrain, bike, input, collisions)
  renderer.js       Neon canvas rendering + shared UI primitives + HUD
  controls.js       Keyboard + touch input
  ui.js             Menus, garage, shop, level select, results screens
  main.js           State machine + fixed-timestep game loop
.github/workflows/deploy.yml   Deploy to GitHub Pages
```

## Deployment

Pushing to `main` triggers the GitHub Pages workflow in `.github/workflows/deploy.yml`,
which uploads the repository as a static site. Enable **Pages → Build and deployment →
GitHub Actions** in the repo settings.

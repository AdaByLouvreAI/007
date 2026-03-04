# Ship Beat'em Up Beta

A browser-playable beta prototype built from your design notes.

## Run

Open `index.html` in a browser.

If you want a local server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Controls

- `WASD` / Arrow keys: Move
- Mouse: Aim
- Hold left mouse: Fire
- `R`: Toggle `Assault` / `Sniper`
- `1`: Dash
- `2`: Attack speed buff (8s)
- `3`: Next shot explosive
- `4`: Summon temporary fleet
- `F3`: Toggle Schizo Debug overlay
- `P`: Pause
- `Enter`: Restart run after death (keeps card progression)

## Implemented Beta Systems

- Player base stats (`100 HP`, `50 Armor`) and scaling card stats.
- Fleet companions in V formation.
- Revive charge system.
- Explosive shots with enlarged impact radius.
- Melee orbiting orbs that damage enemies.
- Sniper vs Assault fire mode.
- Camera follows ship with speed and ship-size scaling.
- Endless traversable grid map.
- Enemy spawn around player with random attributes:
  - Bullet size
  - Bullet speed
  - Health
  - Ship speed
  - Ricochet chance
- Enemy collision damage over time.
- Enemy death cleanup + card shard drops.
- Card system with rarity tiers:
  - Common, Uncommon, Rare, Prime, Satanic
- Elemental cards:
  - Heat, Cold, Toxin, Electricity
- Combined elements:
  - Viral, Corrosive, Radiation, Magnetic, Blast
- Stronger progression based on kills/time.
- "Schizo Debug" diagnostics panel for live runtime values.

## Notes

This is a beta gameplay foundation, not final balance. Values are tuned for fast iteration and can be adjusted in `game.js`.

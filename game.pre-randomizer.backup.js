(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hpBar = document.querySelector("#hpBar b");
  const shieldBar = document.querySelector("#shieldBar b");
  const armorBar = document.querySelector("#armorBar b");
  const xpBar = document.querySelector("#xpBar b");
  const statsText = document.getElementById("statsText");
  const buffPanel = document.getElementById("buffPanel");

  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false };

  const WORLD_MILE = 160;
  const SPAWN_MIN = WORLD_MILE * 1;
  const SPAWN_MAX = WORLD_MILE * 100;
  const GRID = 120;
  const VIEW_TILES_X = 15;
  const VIEW_TILES_Y = 9;
  const CHALLENGE_MULTIPLIER = 10;
  const CARD_DROP_BASE_CHANCE = 0.015;
  const ENEMY_BULLET_SPEED_MULT = 0.429;
  const PRESTIGE_SPIN_SCORE = 1000;
  const ABILITY_POWER_MULT = 3;

  const RARITIES = [
    { name: "Common", color: "#4e79a7", weight: 70 },
    { name: "Uncommon", color: "#59a14f", weight: 19 },
    { name: "Rare", color: "#e15759", weight: 8 },
    { name: "Prime", color: "#f28e2b", weight: 2.5 },
    { name: "Satanic", color: "#b31f5c", weight: 0.5 }
  ];
  const RARITY_TRAITS = {
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Prime: 4,
    Satanic: 5
  };

  const ELEMENTS = ["Heat", "Cold", "Toxin", "Electricity"];
  const ELEMENT_COLORS = {
    Heat: "#ff8c3b",
    Cold: "#72b6ff",
    Toxin: "#65d55a",
    Electricity: "#b781ff",
    Viral: "#89ecff",
    Corrosive: "#8df3a5",
    Radiation: "#f2f27f",
    Magnetic: "#79b6ff",
    Blast: "#ffb26a"
  };

  const COMBOS = {
    "Heat+Cold": "Blast",
    "Cold+Toxin": "Viral",
    "Toxin+Electricity": "Corrosive",
    "Heat+Electricity": "Radiation",
    "Cold+Electricity": "Magnetic"
  };
  const STATUS_KEYS = ["Heat", "Cold", "Toxin", "Electricity", "Viral", "Corrosive", "Radiation", "Magnetic", "Blast"];

  const CARD_POOL = [
    { id: "attack", label: "Attack", apply: (p, amt) => p.attack += amt * 1.2, desc: "+Attack" },
    { id: "armor", label: "Armor", apply: (p, amt) => { p.maxArmor += amt * 6; p.armor += amt * 6; }, desc: "+Armor" },
    { id: "health", label: "Health", apply: (p, amt) => { p.maxHp += amt * 10; p.hp += amt * 10; }, desc: "+Health" },
    { id: "critChance", label: "Crit Chance", apply: (p, amt) => p.critChance += amt * 0.015, desc: "+Crit Chance" },
    { id: "critDamage", label: "Crit Damage", apply: (p, amt) => p.critDamage += amt * 0.08, desc: "+Crit Damage" },
    { id: "luck", label: "Luck", apply: (p, amt) => p.luck += amt * 0.18, desc: "+Luck" },
    { id: "shipSpeed", label: "Ship Speed", apply: (p, amt) => p.shipSpeed += amt * 15, desc: "+Ship Speed" },
    { id: "bulletSpeed", label: "Bullet Speed", apply: (p, amt) => p.bulletSpeed += amt * 20, desc: "+Bullet Speed" },
    { id: "bulletSize", label: "Bullet Size", apply: (p, amt) => p.bulletSize += amt * 0.35, desc: "+Bullet Size" },
    { id: "shipSize", label: "Ship Size", apply: (p, amt) => p.shipSize += amt * 0.4, desc: "+Ship Size" },
    { id: "range", label: "Range", apply: (p, amt) => p.range += amt * 22, desc: "+Range" },
    {
      id: "meleeDamage",
      label: "Melee Damage",
      apply: (p, amt) => {
        p.meleeUnlocked = true;
        p.meleeDamage += amt * 1.5;
        p.meleeRPM += Math.max(2, amt * 4);
      },
      desc: "+Orb Damage + Orb RPM"
    },
    { id: "meleeRPM", label: "Melee RPM", apply: (p, amt) => { p.meleeUnlocked = true; p.meleeRPM += amt * 7; }, desc: "+Orb Spin RPM" },
    { id: "attackSpeed", label: "Attack Speed", apply: (p, amt) => p.fireRate += amt * 0.35, desc: "+RPM" },
    { id: "comboDuration", label: "Combo Duration", apply: (p, amt) => p.comboDuration += amt * 0.9, desc: "+Combo Time" },
    { id: "heavyEff", label: "Heavy Attack", apply: (p, amt) => p.explosiveRadiusMult += amt * 0.09, desc: "+Explosion Radius" },
    { id: "explosiveRounds", label: "Explosive Rounds", apply: (p, amt) => p.explosiveChance += amt * 0.02, desc: "+Explosive Chance" },
    { id: "lifeSteal", label: "Life Steal", apply: (p, amt) => p.lifeSteal += amt * 0.01, desc: "+Life Steal" },
    { id: "fleet", label: "Companion Fleet", apply: (p, amt) => p.fleetCount += Math.max(1, Math.round(amt * 0.6)), desc: "+Fleet Ships" },
    { id: "multi", label: "Multi Shoot", apply: (p, amt) => p.multiShoot += Math.max(1, Math.floor(amt / 2)), desc: "+Extra Bullets" },
    { id: "shieldRegen", label: "Shield Regen", apply: (p, amt) => { p.shieldRegen += amt * 0.4; p.maxShield += amt * 5; p.shield = Math.min(p.maxShield, p.shield + amt * 4); }, desc: "+Shield Regen" },
    { id: "statusRes", label: "Status Resistance", apply: (p, amt) => p.statusRes += amt * 0.08, desc: "+Status Resist" },
    { id: "pierce", label: "Pierce +1", apply: (p, amt) => p.pierce += Math.max(1, Math.round(amt * 0.5)), desc: "+Bullet Pierce" },
    { id: "fork", label: "Fork Shot", apply: (p, amt) => p.forkChance += amt * 0.05, desc: "+Fork Chance" },
    { id: "heavySlug", label: "Heavy Slug", apply: (p, amt) => { p.damageMult += amt * 0.06; p.fireRate = Math.max(1.4, p.fireRate - amt * 0.12); }, desc: "+Damage, -RPM" },
    { id: "statusEngine", label: "Status Engine", apply: (p, amt) => p.statusChance += amt * 0.02, desc: "+Status Proc" },
    { id: "statusPower", label: "Status Power", apply: (p, amt) => p.statusPower += amt * 0.08, desc: "+Status Strength" },
    { id: "shieldGate", label: "Shield Gate", apply: (p, amt) => p.shieldGate += amt * 0.08, desc: "+Invuln on Shield Break" },
    { id: "reactiveArmor", label: "Reactive Armor", apply: (p, amt) => p.reactiveArmor += amt * 0.12, desc: "+Armor on Hit" },
    { id: "emergencyRepair", label: "Emergency Repair", apply: (p, amt) => p.emergencyRepair += amt * 0.14, desc: "+Low HP Auto Heal" },
    { id: "fleetDmg", label: "Fleet Doctrine", apply: (p, amt) => p.fleetDamageMult += amt * 0.08, desc: "+Fleet Damage" },
    { id: "fleetCrit", label: "Fleet Precision", apply: (p, amt) => p.fleetCritChance += amt * 0.02, desc: "+Fleet Crit" },
    { id: "fleetStatus", label: "Fleet Rounds", apply: (p, amt) => p.fleetStatusChance += amt * 0.03, desc: "+Fleet Status" },
    { id: "xpMagnet", label: "XP Magnet", apply: (p, amt) => p.xpMagnet += amt * 0.12, desc: "+XP Vacuum" },
    { id: "prestigeGain", label: "Prestige Gain", apply: (p, amt) => p.prestigeGainMult += amt * 0.09, desc: "+Prestige Score" },
    { id: "cardLuck", label: "Card Drop Luck", apply: (p, amt) => p.cardDropLuck += amt * 0.02, desc: "+Card Drop Chance" },
    { id: "rareBias", label: "Rare Bias", apply: (p, amt) => p.rareBias += amt * 0.02, desc: "+Upgrade Chance" },
    { id: "thermalShock", label: "Thermal Shock", apply: (p, amt) => p.thermalShock += amt * 0.2, desc: "Heat+Cold Pulses" },
    { id: "bioConductor", label: "Bio Conductor", apply: (p, amt) => p.bioConductor += amt * 0.2, desc: "Elec adds Viral" },
    { id: "magRupture", label: "Magnetic Rupture", apply: (p, amt) => p.magneticRupture += amt * 0.2, desc: "Magnetic Explosive Burst" },
    { id: "warChoir", label: "War Choir", apply: (p, amt) => p.warChoir += amt * 0.2, desc: "Fleet>=6 boosts status/melee" }
  ];
  const PRESTIGE_POOL = [
    { id: "p_attack", label: "Edge Core", stat: "+0.6 ATK", color: "#ff8c3b", apply: (p) => p.attack += 0.6 },
    { id: "p_hp", label: "Hull Weave", stat: "+4 HP", color: "#ff4d6d", apply: (p) => { p.maxHp += 4; p.hp += 4; } },
    { id: "p_armor", label: "Plate Rivet", stat: "+3 Armor", color: "#7ab8ff", apply: (p) => { p.maxArmor += 3; p.armor += 3; } },
    { id: "p_shield", label: "Capacitor", stat: "+4 Shield", color: "#8df3ff", apply: (p) => { p.maxShield += 4; p.shield += 4; } },
    { id: "p_shield_regen", label: "Recharge Coil", stat: "+0.45 Shield Regen", color: "#6ef7ff", apply: (p) => p.shieldRegen += 0.45 },
    { id: "p_speed", label: "Thruster", stat: "+6 Ship Speed", color: "#ffd166", apply: (p) => p.shipSpeed += 6 },
    { id: "p_range", label: "Long Scope", stat: "+10 Range", color: "#d6c8ff", apply: (p) => p.range += 10 },
    { id: "p_fire", label: "Autoloader", stat: "+0.12 Fire Rate", color: "#ffb26a", apply: (p) => p.fireRate += 0.12 },
    { id: "p_critc", label: "Lucky Edge", stat: "+0.3% Crit", color: "#9effa9", apply: (p) => p.critChance += 0.003 },
    { id: "p_critd", label: "Weakpoint", stat: "+0.02 Crit Dmg", color: "#f7a8ff", apply: (p) => p.critDamage += 0.02 },
    { id: "p_melee", label: "Orb Wire", stat: "+0.5 Melee Dmg", color: "#b6fff5", apply: (p) => p.meleeDamage += 0.5 },
    { id: "p_lifesteal", label: "Leech Lattice", stat: "+0.002 Life Steal", color: "#88ffb4", apply: (p) => p.lifeSteal += 0.002 },
    { id: "p_bsize", label: "Payload", stat: "+0.08 Bullet Size", color: "#ffd2a6", apply: (p) => p.bulletSize += 0.08 },
    { id: "p_bspeed", label: "Pulse Driver", stat: "+7 Bullet Speed", color: "#ffe08a", apply: (p) => p.bulletSpeed += 7 },
    { id: "p_luck", label: "Fate Wire", stat: "+0.04 Luck", color: "#ceff8b", apply: (p) => p.luck += 0.04 }
  ];

  const state = {
    time: 0,
    nowMs: 0,
    dt: 0,
    gameOver: false,
    awaitingPrestigeSpin: false,
    autoRestartAtMs: 0,
    autoRestartDelayMs: 1800,
    paused: false,
    debug: true,
    kills: 0,
    totalCards: 0,
    nextEnemyId: 1,
    cardShards: 0,
    nextSpawnAt: 0,
    comboTimer: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    entities: {
      playerBullets: [],
      enemyBullets: [],
      enemies: [],
      drops: [],
      xpBits: [],
      mines: [],
      blasts: [],
      fleet: []
    },
    telemetry: {
      enabled: true,
      events: [],
      maxEvents: 30000,
      wave: 0,
      lastSnapshotAt: 0,
      counters: {
        playerShots: 0,
        enemyShots: 0,
        enemyKills: 0,
        cards: 0,
        drops: 0,
        abilityUses: 0,
        playerDamageTaken: 0,
        playerDamageHealed: 0,
        playerDeaths: 0
      }
    },
    prestige: {
      score: 0,
      spins: 0,
      spent: 0,
      nextSpinAt: PRESTIGE_SPIN_SCORE,
      tree: [],
      lastNode: null,
      offers: []
    },
    debugLines: [],
    ui: {
      buffCache: "",
      recentCards: []
    }
  };

  const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hp: 1000,
    maxHp: 1000,
    armor: 50,
    maxArmor: 50,
    shield: 45,
    maxShield: 45,
    shieldRegen: 8,
    shieldRegenDelay: 2.2,
    shieldRegenCooldown: 0,
    attack: 12,
    critChance: 0.15,
    critDamage: 1.8,
    luck: 1,
    xp: 0,
    level: 1,
    xpToNext: 50,
    shipSpeed: 300,
    bulletSpeed: 560,
    bulletSize: 4,
    shipSize: 15,
    range: 460,
    fireRate: 7,
    damageMult: 1,
    accuracyPenalty: 0,
    meleeDamage: 5,
    meleeRPM: 60,
    meleeUnlocked: false,
    comboDuration: 8,
    explosiveRadiusMult: 1,
    explosiveChance: 0.08,
    lifeSteal: 0.02,
    fleetCount: 3,
    fleetDamageMult: 1,
    fleetCritChance: 0.06,
    fleetStatusChance: 0.1,
    multiShoot: 1,
    pierce: 0,
    forkChance: 0,
    statusChance: 0.28,
    statusPower: 1,
    xpMagnet: 1,
    prestigeGainMult: 1,
    cardDropLuck: 0,
    rareBias: 0,
    shieldGate: 0,
    shieldGateUntil: 0,
    reactiveArmor: 0,
    emergencyRepair: 0,
    emergencyUsedAt: -9999,
    thermalShock: 0,
    bioConductor: 0,
    magneticRupture: 0,
    warChoir: 0,
    armorRegen: 1.2,
    statusRes: 0,
    mode: "assault",
    reviveCharges: 1,
    nextShotExplosive: false,
    explosiveShotsQueued: 0,
    cooldowns: {
      dash: 0,
      speed: 0,
      explosive: 0,
      fleet: 0,
      mine: 0,
      aegis: 0,
      frenzy: 0,
      mark: 0,
      command: 0
    },
    buffs: {
      speedFireUntil: 0,
      summonFleetUntil: 0,
      overclockUntil: 0,
      orbFrenzyUntil: 0,
      fleetCommandUntil: 0
    },
    fleetCommandMode: "focus",
    markedEnemyId: null,
    meleePulseAt: 0,
    shootTimer: 0,
    orbitAngle: 0,
    aimAngle: 0,
    renderAngle: 0,
    idleSpinAngle: 0,
    elements: new Set(),
    combos: new Set()
  };

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pickWeighted(items) {
    const total = items.reduce((n, item) => n + item.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return items[0];
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function ensureEnemyStatus(enemy) {
    if (enemy.status) return enemy.status;
    enemy.status = {
      Heat: { stacks: 0, t: 0 },
      Cold: { stacks: 0, t: 0 },
      Toxin: { stacks: 0, t: 0 },
      Electricity: { stacks: 0, t: 0, pulseT: 0 },
      Viral: { stacks: 0, t: 0 },
      Corrosive: { stacks: 0, t: 0 },
      Radiation: { stacks: 0, t: 0 },
      Magnetic: { stacks: 0, t: 0 },
      Blast: { stacks: 0, t: 0 }
    };
    return enemy.status;
  }

  function addStatusStack(enemy, name, duration, maxStacks) {
    const status = ensureEnemyStatus(enemy);
    const entry = status[name];
    entry.stacks = clamp(entry.stacks + 1, 1, maxStacks);
    entry.t = Math.max(entry.t, duration);
    if (name === "Electricity") {
      entry.pulseT = Math.min(entry.pulseT || 0, 0.25);
    }
  }

  function statusStacks(enemy, name) {
    const status = ensureEnemyStatus(enemy);
    return status[name].stacks;
  }

  function getOrbCount() {
    if (!player.meleeUnlocked) return 0;
    return clamp(1 + Math.floor(player.meleeDamage / 4), 1, 16);
  }

  function getExplosionRadius() {
    // Minimum diameter is a little over 3 full blocks.
    return Math.max(GRID * 1.6, 68 * player.explosiveRadiusMult);
  }

  function spawnBlastFx(x, y, radius, color = "rgba(255, 178, 103, 0.85)") {
    state.entities.blasts.push({
      x,
      y,
      radius,
      life: 0.22,
      maxLife: 0.22,
      color
    });
  }

  function applyExplosionAoE(cx, cy, baseDamage, color = "rgba(255, 178, 103, 0.85)") {
    const radius = getExplosionRadius();
    spawnBlastFx(cx, cy, radius, color);
    let hits = 0;
    for (const e of state.entities.enemies) {
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d > radius) continue;
      const falloff = 1 - d / radius;
      let splash = baseDamage * (0.75 * falloff + 0.25);
      // Keep splash noticeable even when enemy HP pools are large.
      splash = Math.max(splash, 18);
      if (player.magneticRupture > 0 && statusStacks(e, "Magnetic") > 0) {
        splash *= 1 + player.magneticRupture * 0.4;
      }
      e.hp -= splash;
      applyStatusProc(e, 0.28);
      hits += 1;
    }
    if (hits > 1) addDebug(`AOE hit ${hits} targets`);
    return { hits, radius };
  }

  function worldFromScreen(sx, sy) {
    return {
      x: state.camera.x + (sx - canvas.width / 2) / state.camera.zoom,
      y: state.camera.y + (sy - canvas.height / 2) / state.camera.zoom
    };
  }

  function toScreen(wx, wy) {
    return {
      x: (wx - state.camera.x) * state.camera.zoom + canvas.width / 2,
      y: (wy - state.camera.y) * state.camera.zoom + canvas.height / 2
    };
  }

  function drawShip(x, y, r, color, angle = 0) {
    const p = toScreen(x, y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(r * 1.4 * state.camera.zoom, 0);
    ctx.lineTo(-r * 0.8 * state.camera.zoom, r * 0.9 * state.camera.zoom);
    ctx.lineTo(-r * 0.5 * state.camera.zoom, 0);
    ctx.lineTo(-r * 0.8 * state.camera.zoom, -r * 0.9 * state.camera.zoom);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function addDebug(line) {
    state.debugLines.push(line);
    if (state.debugLines.length > 13) state.debugLines.shift();
  }

  function logEvent(type, data = {}) {
    if (!state.telemetry.enabled) return;
    state.telemetry.events.push({
      t: Number(state.time.toFixed(2)),
      type,
      ...data
    });
    if (state.telemetry.events.length > state.telemetry.maxEvents) {
      state.telemetry.events.shift();
    }
  }

  function telemetrySummary() {
    return {
      runTimeSec: Number(state.time.toFixed(1)),
      level: player.level,
      kills: state.kills,
      cards: state.totalCards,
      prestigeScore: Math.floor(state.prestige.score),
      prestigeSpins: state.prestige.spins,
      prestigeNodes: state.prestige.tree.length,
      enemiesAlive: state.entities.enemies.length,
      dropsAlive: state.entities.drops.length,
      ...state.telemetry.counters
    };
  }

  function addPrestigeScore(amount, source = "xp") {
    if (amount <= 0) return;
    state.prestige.score += amount * player.prestigeGainMult;
    while (state.prestige.score >= state.prestige.nextSpinAt) {
      state.prestige.spins += 1;
      state.prestige.nextSpinAt += PRESTIGE_SPIN_SCORE;
      addDebug(`PRESTIGE SPIN READY x${state.prestige.spins}`);
      logEvent("prestige_spin_ready", { spins: state.prestige.spins, score: Math.floor(state.prestige.score), source });
    }
  }

  function rollPrestigeOffers() {
    const pool = PRESTIGE_POOL.slice().sort(() => Math.random() - 0.5);
    state.prestige.offers = pool.slice(0, 3).map((n) => ({ id: n.id, label: n.label, stat: n.stat, color: n.color }));
  }

  function getPrestigeNodeById(id) {
    return PRESTIGE_POOL.find((n) => n.id === id) || null;
  }

  function spinPrestigeTree(offerIndex = null) {
    if (!state.gameOver) {
      addDebug("Prestige spins are only available after death");
      return;
    }
    if (state.prestige.spins <= 0) {
      addDebug(`Need ${Math.max(0, Math.floor(state.prestige.nextSpinAt - state.prestige.score))} prestige score for next spin`);
      return;
    }
    if (!state.prestige.offers.length) {
      rollPrestigeOffers();
    }
    let node = null;
    if (offerIndex !== null && offerIndex >= 0 && offerIndex < state.prestige.offers.length) {
      node = getPrestigeNodeById(state.prestige.offers[offerIndex].id);
    }
    if (!node) {
      node = PRESTIGE_POOL[Math.floor(Math.random() * PRESTIGE_POOL.length)];
    }
    node.apply(player);
    state.prestige.spins -= 1;
    state.prestige.spent += 1;
    state.prestige.lastNode = node.id;
    const existing = state.prestige.tree.find((n) => n.id === node.id);
    if (existing) existing.rank += 1;
    else state.prestige.tree.push({ id: node.id, label: node.label, stat: node.stat, rank: 1, color: node.color });
    addDebug(`Prestige spin: ${node.label}`);
    logEvent("prestige_spin", { node: node.id, label: node.label, left: state.prestige.spins });
    if (state.prestige.spins <= 0) {
      state.prestige.offers = [];
      state.autoRestartAtMs = state.nowMs + state.autoRestartDelayMs;
    } else {
      rollPrestigeOffers();
    }
  }

  function attachTelemetryApi() {
    window.gameTelemetry = {
      getEvents: () => [...state.telemetry.events],
      getSummary: () => telemetrySummary(),
      clear: () => { state.telemetry.events.length = 0; },
      printSummary: () => console.table(telemetrySummary()),
      exportJson: () => {
        const payload = {
          exportedAt: new Date().toISOString(),
          summary: telemetrySummary(),
          events: state.telemetry.events
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `run-log-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    };
  }

  function damagePlayer(raw) {
    if (raw <= 0 || state.gameOver) return;
    if (state.time < player.shieldGateUntil) return;
    let dmg = raw;
    player.shieldRegenCooldown = player.shieldRegenDelay;
    const hadShield = player.shield > 0;
    if (player.shield > 0) {
      const shieldAbsorb = Math.min(player.shield, dmg);
      player.shield -= shieldAbsorb;
      dmg -= shieldAbsorb;
    }
    if (hadShield && player.shield <= 0 && player.shieldGate > 0) {
      player.shieldGateUntil = state.time + Math.min(1.2, player.shieldGate);
    }
    if (player.armor > 0) {
      const absorb = Math.min(player.armor, dmg * 0.65);
      player.armor -= absorb;
      dmg -= absorb;
    }
    if (player.reactiveArmor > 0) {
      player.armor = Math.min(player.maxArmor, player.armor + player.reactiveArmor * 0.7);
    }
    state.telemetry.counters.playerDamageTaken += dmg;
    player.hp -= dmg;
    if (player.emergencyRepair > 0 && player.hp < player.maxHp * 0.25 && state.time - player.emergencyUsedAt > 12) {
      player.emergencyUsedAt = state.time;
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * Math.min(0.3, player.emergencyRepair * 0.08));
    }
    if (player.hp <= 0) {
      if (player.reviveCharges > 0) {
        player.reviveCharges -= 1;
        player.hp = player.maxHp * 0.65;
        player.armor = player.maxArmor * 0.5;
        player.shield = player.maxShield * 0.4;
        addDebug("REVIVE TRIGGERED");
        logEvent("revive", { hp: Number(player.hp.toFixed(1)), armor: Number(player.armor.toFixed(1)) });
      } else {
        state.gameOver = true;
        state.awaitingPrestigeSpin = true;
        state.autoRestartAtMs = state.nowMs + state.autoRestartDelayMs;
        if (state.prestige.spins > 0) rollPrestigeOffers();
        state.telemetry.counters.playerDeaths += 1;
        logEvent("player_death", { kills: state.kills, level: player.level });
      }
    }
  }

  function healPlayer(amount) {
    if (amount <= 0) return;
    player.hp = Math.min(player.maxHp, player.hp + amount);
    state.telemetry.counters.playerDamageHealed += amount;
  }

  function dropCardShard(x, y, enemyPower) {
    state.entities.drops.push({
      x,
      y,
      r: 7,
      life: 15,
      power: enemyPower,
      element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]
    });
    state.telemetry.counters.drops += 1;
  }

  function dropXpBits(x, y, totalXp) {
    const count = clamp(Math.round(totalXp / 3), 3, 14);
    let remaining = totalXp;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const dist = rand(6, 40);
      const value = i === count - 1 ? remaining : Math.max(1, Math.round(totalXp / count + rand(-0.7, 0.7)));
      remaining -= value;
      state.entities.xpBits.push({
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        vx: Math.cos(a) * rand(25, 80),
        vy: Math.sin(a) * rand(25, 80),
        r: 7 + Math.random() * 3.2,
        value,
        life: 55,
        magnetDelay: 0.55
      });
    }
  }

  function boostDifficultyOnLevelUp() {
    for (const e of state.entities.enemies) {
      const hpBoost = 1.08;
      e.maxHp *= hpBoost;
      e.hp *= hpBoost;
      e.speed *= 1.05;
      e.damage *= 1.08;
      e.bulletSpeed *= 1.05;
    }
  }

  function gainXp(v) {
    addPrestigeScore(v * 2.4, "xp");
    player.xp += v;
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level += 1;
      player.xpToNext = Math.round(player.xpToNext * 1.24 + 18);
      addPrestigeScore(player.level * 12, "level");
      boostDifficultyOnLevelUp();
      addDebug(`LEVEL ${player.level}: enemy pressure up`);
      logEvent("level_up", { level: player.level, harderEnemies: true });
      if (player.level % 2 === 0) {
        grantRandomCard(0.9 + player.level * 0.06, "level-up");
      }
    }
  }

  function getSpawnPointAroundView() {
    const halfW = (VIEW_TILES_X * GRID) * 0.5;
    const halfH = (VIEW_TILES_Y * GRID) * 0.5;
    const pad = GRID * rand(1.1, 2.2);
    const side = Math.floor(rand(0, 4));
    let x = player.x;
    let y = player.y;
    if (side === 0) {
      x = player.x + rand(-halfW, halfW);
      y = player.y - (halfH + pad);
    } else if (side === 1) {
      x = player.x + (halfW + pad);
      y = player.y + rand(-halfH, halfH);
    } else if (side === 2) {
      x = player.x + rand(-halfW, halfW);
      y = player.y + (halfH + pad);
    } else {
      x = player.x - (halfW + pad);
      y = player.y + rand(-halfH, halfH);
    }
    return { x, y };
  }

  function spawnEnemy(amount = 1) {
    let kamikazeCount = 0;
    let rangedCount = 0;
    let dartCount = 0;
    for (let i = 0; i < amount; i++) {
      const spawn = getSpawnPointAroundView();
      const x = spawn.x;
      const y = spawn.y;
      const progression = 1 + state.kills * 0.02 + state.time * 0.003;
      const levelPressure = 1 + Math.max(0, player.level - 1) * 0.2;
      const difficulty = progression * (1 + CHALLENGE_MULTIPLIER * 0.35) * levelPressure;
      const moveDifficulty = progression * (1 + CHALLENGE_MULTIPLIER * 0.08);
      let scale = Math.pow(rand(0.7, 2.8), 0.78);
      const hpScale = rand(1.4, 5.8);
      const speedScale = rand(0.85, 1.8);
      const bulletScale = rand(0.9, 2.7);
      const damageScale = rand(1.0, 2.9);
      const fireScale = rand(0.7, 1.2);
      const roll = Math.random();
      const type = roll < 0.32 ? "kamikaze" : roll < 0.8 ? "ranged" : "dart";
      if (type === "kamikaze") kamikazeCount += 1;
      else if (type === "ranged") rangedCount += 1;
      else dartCount += 1;
      if (type === "dart") scale *= rand(0.34, 0.62);
      const hp = type === "dart" ? 9 * difficulty * scale * rand(0.7, 1.3) : 28 * difficulty * scale * hpScale;
      const baseSpeed =
        type === "kamikaze"
          ? rand(55, 105) * moveDifficulty * speedScale
          : type === "dart"
            ? rand(42, 92) * moveDifficulty * speedScale
            : rand(22, 52) * moveDifficulty * speedScale;
      const bulletSizeRoll = type === "dart" ? rand(1.3, 2.8) : rand(3, 10) * clamp(scale, 0.9, 2.8) * bulletScale * 0.7;
      const bulletSpeedFactor = 1 / (0.75 + bulletScale * 1.1);
      const sizeSlowFactor = 1 / (0.8 + bulletSizeRoll * 0.18);
      state.entities.enemies.push({
        id: state.nextEnemyId++,
        x,
        y,
        vx: 0,
        vy: 0,
        type,
        size: 11 * scale,
        hp,
        maxHp: hp,
        speed: baseSpeed * 0.2,
        bulletSize: bulletSizeRoll,
        bulletSpeed: (type === "dart" ? rand(260, 420) : rand(180, 360)) * difficulty * bulletSpeedFactor * sizeSlowFactor * ENEMY_BULLET_SPEED_MULT,
        damage: (type === "dart" ? rand(3, 7) : rand(8, 16)) * difficulty * damageScale,
        ricochet: Math.random() < (0.18 + state.time * 0.0007),
        shootCd: rand(0.15, 1.1),
        shootEvery: (type === "kamikaze" ? rand(2.2, 4.2) : type === "dart" ? rand(0.28, 0.72) : rand(0.8, 2.1)) * fireScale,
        shootRange: type === "kamikaze" ? 0 : type === "dart" ? rand(220, 420) : rand(300, 520),
        preferredDistance: type === "kamikaze" ? 0 : type === "dart" ? rand(180, 300) : rand(240, 420),
        orbitDir: Math.random() < 0.5 ? -1 : 1,
        canShoot: type !== "kamikaze",
        contactDps: type === "kamikaze" ? 24 : type === "dart" ? 4 : 8,
        markedUntil: 0,
        status: null,
        xp: 8 + scale * 5 + hpScale * 2,
        power: difficulty * scale
      });
    }
    return { kamikazeCount, rangedCount, dartCount };
  }

  function shootBullet(fromX, fromY, tx, ty, owner, mods = {}) {
    const dx = tx - fromX;
    const dy = ty - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * mods.speed;
    const vy = (dy / len) * mods.speed;
    const bullet = {
      x: fromX,
      y: fromY,
      vx,
      vy,
      life: mods.range / mods.speed,
      dmg: mods.damage,
      size: mods.size,
      explosive: !!mods.explosive,
      ricochet: !!mods.ricochet,
      pierce: mods.pierce || 0,
      source: owner
    };
    if (owner === "player") state.entities.playerBullets.push(bullet);
    else state.entities.enemyBullets.push(bullet);
  }

  function findNearestEnemy(maxDist = Infinity) {
    let best = null;
    let bestD = maxDist;
    for (const e of state.entities.enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function playerShoot(dt, canShoot) {
    const nearest = findNearestEnemy(player.range * 2);
    const tx = nearest ? nearest.x : worldFromScreen(mouse.x, mouse.y).x;
    const ty = nearest ? nearest.y : worldFromScreen(mouse.x, mouse.y).y;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const targetAngle = Math.atan2(dy, dx);
    const speedBuffMult = 1 + (1.65 - 1) * ABILITY_POWER_MULT;
    const activeFireRate =
      player.fireRate *
      (state.time < player.buffs.speedFireUntil ? speedBuffMult : 1) *
      (player.mode === "assault" ? 1.9 : 1);
    player.shootTimer -= dt;
    const shouldAutoFire = !!nearest;
    if (!canShoot || !shouldAutoFire || player.shootTimer > 0) return;

    player.shootTimer = 1 / activeFireRate;
    const shots = 1 + player.multiShoot;
    state.telemetry.counters.playerShots += shots;
    const overclock = state.time < player.buffs.overclockUntil;
    const spread = player.mode === "sniper" ? 0.01 : 0.03;
    const baseAngle = targetAngle;
    const lineGap = 11;

    for (let i = 0; i < shots; i++) {
      const lineIndex = i - (shots - 1) / 2;
      const missScale = Math.abs(lineIndex) / Math.max(1, (shots - 1) / 2);
      const jitterBase = player.mode === "assault" ? rand(-0.06, 0.06) * (0.45 + missScale) : rand(-0.012, 0.012) * (0.4 + missScale);
      const jitter = jitterBase * (1 + player.accuracyPenalty + (overclock ? 0.55 : 0));
      const a = baseAngle + (player.mode === "assault" ? rand(-spread, spread) * 0.3 : 0) + jitter;
      const speed = (player.mode === "sniper" ? player.bulletSpeed * 1.15 : player.bulletSpeed) * (overclock ? 1.3 : 1);
      const range = player.mode === "sniper" ? player.range * 1.45 : player.range;
      const dmg = (player.mode === "sniper" ? player.attack * 2 : player.attack * 0.42) * player.damageMult * (overclock ? 1.2 : 1) * rand(0.92, 1.07);
      const ox = player.x - Math.cos(baseAngle) * (lineIndex * lineGap);
      const oy = player.y - Math.sin(baseAngle) * (lineIndex * lineGap);
      shootBullet(ox, oy, ox + Math.cos(a) * 40, oy + Math.sin(a) * 40, "player", {
        speed,
        range,
        damage: dmg,
        size: player.bulletSize,
        explosive: Math.random() < clamp(player.explosiveChance, 0, 0.9),
        ricochet: Math.random() < 0.07,
        pierce: player.pierce
      });
    }
    fleetShootVolley(tx, ty, baseAngle);
  }

  function enemyShoot(enemy, dist) {
    if (!enemy.canShoot) return;
    if (dist > enemy.shootRange) return;
    enemy.shootCd -= state.dt;
    if (enemy.shootCd > 0) return;
    enemy.shootCd = enemy.shootEvery;
    state.telemetry.counters.enemyShots += 1;
    const radStacks = statusStacks(enemy, "Radiation");
    const miss = rand(-1, 1) * (radStacks * 28 + (enemy.accuracyPenalty || 0) * 42);
    shootBullet(enemy.x, enemy.y, player.x + miss, player.y + miss, "enemy", {
      speed: enemy.bulletSpeed,
      range: 520,
      damage: enemy.damage,
      size: enemy.bulletSize,
      ricochet: enemy.ricochet
    });
  }

  function playerStatusPool() {
    const pool = [];
    for (const e of player.elements) {
      if (STATUS_KEYS.includes(e)) pool.push(e);
    }
    for (const c of player.combos) {
      if (STATUS_KEYS.includes(c)) pool.push(c);
    }
    return pool;
  }

  function applyStatusProc(enemy, chance = 0.28) {
    const pool = playerStatusPool();
    if (!pool.length) return;
    const choirBonus = (state.entities.fleet.length >= 6 ? player.warChoir * 0.06 : 0);
    const procChance = clamp(chance + player.statusChance + player.luck * 0.008 + choirBonus, 0, 0.9);
    if (Math.random() > procChance) return;
    const proc = pool[Math.floor(Math.random() * pool.length)];
    const mult = 1 + player.statusPower * 0.12;
    if (proc === "Heat") addStatusStack(enemy, "Heat", 4 * mult, 6);
    if (proc === "Cold") addStatusStack(enemy, "Cold", 3.6 * mult, 6);
    if (proc === "Toxin") addStatusStack(enemy, "Toxin", 4.5 * mult, 6);
    if (proc === "Electricity") addStatusStack(enemy, "Electricity", 3.5 * mult, 5);
    if (proc === "Viral") addStatusStack(enemy, "Viral", 5 * mult, 5);
    if (proc === "Corrosive") addStatusStack(enemy, "Corrosive", 5 * mult, 6);
    if (proc === "Radiation") addStatusStack(enemy, "Radiation", 4.5 * mult, 4);
    if (proc === "Magnetic") addStatusStack(enemy, "Magnetic", 4 * mult, 6);
    if (proc === "Blast") addStatusStack(enemy, "Blast", 1.4 * mult, 2);
    if (proc === "Electricity" && player.bioConductor > 0 && Math.random() < player.bioConductor * 0.25) {
      addStatusStack(enemy, "Viral", 3.5 * mult, 5);
    }
  }

  function updateEnemyStatuses(enemy, dt) {
    const status = ensureEnemyStatus(enemy);
    let speedMult = 1;
    let incomingMult = 1;
    let accuracyPenalty = 0;

    for (const name of STATUS_KEYS) {
      const entry = status[name];
      if (entry.t > 0) {
        entry.t -= dt;
      } else {
        entry.t = 0;
        entry.stacks = 0;
      }
    }

    if (status.Heat.stacks > 0) {
      enemy.hp -= (2 + status.Heat.stacks * 1.4) * dt;
    }
    if (status.Toxin.stacks > 0) {
      enemy.hp -= (2.6 + status.Toxin.stacks * 1.8) * dt;
    }
    if (status.Cold.stacks > 0) {
      speedMult *= clamp(1 - status.Cold.stacks * 0.11, 0.45, 1);
    }
    if (status.Blast.stacks > 0) {
      speedMult *= 0.22;
      accuracyPenalty += 0.35;
    }
    if (status.Viral.stacks > 0) {
      incomingMult += status.Viral.stacks * 0.1;
    }
    if (status.Corrosive.stacks > 0) {
      incomingMult += status.Corrosive.stacks * 0.08;
    }
    if (status.Magnetic.stacks > 0) {
      incomingMult += status.Magnetic.stacks * 0.05;
      accuracyPenalty += 0.05 * status.Magnetic.stacks;
    }
    if (status.Radiation.stacks > 0) {
      accuracyPenalty += 0.12 * status.Radiation.stacks;
      if (Math.random() < 0.03 * status.Radiation.stacks) {
        enemy.orbitDir *= -1;
      }
    }
    if (status.Electricity.stacks > 0) {
      status.Electricity.pulseT -= dt;
      if (status.Electricity.pulseT <= 0) {
        status.Electricity.pulseT = 0.45;
        const chainDamage = 4 + status.Electricity.stacks * 2.4;
        for (const other of state.entities.enemies) {
          if (other === enemy) continue;
          const d = Math.hypot(other.x - enemy.x, other.y - enemy.y);
          if (d < 130) {
            other.hp -= chainDamage;
          }
        }
      }
    }

    return { speedMult, incomingMult, accuracyPenalty };
  }

  function applyCard(card) {
    const base = card.rarity.name === "Common" ? 1 : card.rarity.name === "Uncommon" ? 1.5 : card.rarity.name === "Rare" ? 2.3 : card.rarity.name === "Prime" ? 3.2 : 4.5;
    let corruption = 0;
    for (const trait of card.traits) {
      let amount = base;
      if (trait.negative) {
        amount *= -0.5;
        corruption += 1;
      }
      trait.mod.apply(player, amount);
      player.elements.add(trait.element);
    }

    for (const a of player.elements) {
      for (const b of player.elements) {
        if (a === b) continue;
        const key = [a, b].sort().join("+");
        const combo = COMBOS[key];
        if (combo) player.combos.add(combo);
      }
    }

    state.totalCards += 1;
    state.telemetry.counters.cards += 1;
    state.ui.recentCards.unshift({
      rarity: card.rarity.name,
      color: card.rarity.color,
      traits: card.traits.map((t) => `${t.mod.label}${t.negative ? " -" : ""}`)
    });
    if (state.ui.recentCards.length > 5) state.ui.recentCards.length = 5;
    renderCardTray();
    addDebug(`AUTO CARD ${card.rarity.name} +${card.traits.length} traits${corruption ? ` (${corruption} corrupted)` : ""}`);
    logEvent("card_gain", { rarity: card.rarity.name, traits: card.traits.map((t) => t.mod.id) });
  }

  function renderCardTray() {
    const cards = state.ui.recentCards;
    if (!cards.length) {
      cardPanel.classList.remove("active");
      cardPanel.innerHTML = "";
      return;
    }
    cardPanel.classList.add("active");
    cardPanel.innerHTML = cards.map((c) => {
      const traits = c.traits.slice(0, 2).join(" | ");
      return `<article class="card mini" style="border-color:${c.color}">
        <h3>${c.rarity}</h3>
        <p>${traits}</p>
      </article>`;
    }).join("");
  }

  function rarityIndexByName(name) {
    return RARITIES.findIndex((r) => r.name === name);
  }

  function makeCard(power = 1) {
    const rolled = pickWeighted(RARITIES);
    let rarityIndex = rarityIndexByName(rolled.name);
    let upgradeChance = clamp(0.008 + power * 0.012 + player.luck * 0.004 + player.rareBias, 0, 0.35);
    while (rarityIndex < RARITIES.length - 1 && Math.random() < upgradeChance) {
      rarityIndex += 1;
      upgradeChance *= 0.5;
    }
    const rarity = RARITIES[rarityIndex];
    const traitCount = RARITY_TRAITS[rarity.name];
    const pool = CARD_POOL.slice().sort(() => Math.random() - 0.5);
    const traits = [];
    for (let i = 0; i < traitCount; i++) {
      const mod = pool[i % pool.length];
      const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      const negative = rarity.name !== "Common" && Math.random() < 0.14;
      traits.push({ mod, element, negative });
    }
    return {
      rarity,
      traits
    };
  }

  function grantRandomCard(power = 1, source = "drop") {
    const card = makeCard(power);
    applyCard(card);
    if (state.debug) {
      addDebug(`${source}: ${card.rarity.name} (${card.traits.map((t) => t.mod.label).join(", ")})`);
    }
  }

  function useAbility(slot) {
    if (slot === 1 && player.cooldowns.dash <= 0) {
      const m = worldFromScreen(mouse.x, mouse.y);
      const a = Math.atan2(m.y - player.y, m.x - player.x);
      state.entities.mines.push({ x: player.x, y: player.y, r: 16, t: 1.2, owner: "player" });
      player.x += Math.cos(a) * (240 * ABILITY_POWER_MULT);
      player.y += Math.sin(a) * (240 * ABILITY_POWER_MULT);
      player.cooldowns.dash = 3.2;
      state.telemetry.counters.abilityUses += 1;
      addDebug("Dash used");
      logEvent("ability_use", { slot: 1, id: "dash" });
    }

    if (slot === 2 && player.cooldowns.speed <= 0) {
      player.buffs.speedFireUntil = state.time + 8 * ABILITY_POWER_MULT;
      player.buffs.overclockUntil = state.time + 4 * ABILITY_POWER_MULT;
      player.cooldowns.speed = 15;
      state.telemetry.counters.abilityUses += 1;
      addDebug(`Overclock (${4 * ABILITY_POWER_MULT}s) + Speed Buff`);
      logEvent("ability_use", { slot: 2, id: "overclock" });
    }

    if (slot === 3) {
      addDebug("Explosive is card-based now (find Explosive Rounds card)");
    }

    if (slot === 4 && player.cooldowns.fleet <= 0) {
      player.buffs.summonFleetUntil = state.time + 15;
      player.cooldowns.fleet = 22;
      state.telemetry.counters.abilityUses += 1;
      addDebug("Temporary fleet summoned (15s)");
      logEvent("ability_use", { slot: 4, id: "summon_fleet" });
    }

    if (slot === 5 && player.cooldowns.aegis <= 0) {
      player.shield = Math.min(player.maxShield, player.shield + 35 * ABILITY_POWER_MULT);
      const pulseR = 140 * ABILITY_POWER_MULT;
      for (const e of state.entities.enemies) {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < pulseR) {
          const n = (pulseR - d) / pulseR;
          e.x += (dx / d) * n * 120;
          e.y += (dy / d) * n * 120;
          e.hp -= 8 * n;
        }
      }
      player.cooldowns.aegis = 14;
      state.telemetry.counters.abilityUses += 1;
      addDebug("Aegis Pulse");
      logEvent("ability_use", { slot: 5, id: "aegis_pulse" });
    }

    if (slot === 6 && player.cooldowns.frenzy <= 0) {
      player.meleeUnlocked = true;
      player.buffs.orbFrenzyUntil = state.time + 6 * ABILITY_POWER_MULT;
      player.cooldowns.frenzy = 18;
      state.telemetry.counters.abilityUses += 1;
      addDebug("Orb Frenzy");
      logEvent("ability_use", { slot: 6, id: "orb_frenzy" });
    }

    if (slot === 7 && player.cooldowns.mark <= 0) {
      let target = null;
      for (const e of state.entities.enemies) {
        if (!target || e.maxHp > target.maxHp) target = e;
      }
      if (target) {
        target.markedUntil = state.time + 8 * ABILITY_POWER_MULT;
        player.markedEnemyId = target.id;
        player.cooldowns.mark = 16;
        state.telemetry.counters.abilityUses += 1;
        addDebug("Hunter Mark");
        logEvent("ability_use", { slot: 7, id: "hunter_mark", target: target.id });
      }
    }

    if (slot === 8 && player.cooldowns.command <= 0) {
      player.fleetCommandMode = player.fleetCommandMode === "focus" ? "sweep" : "focus";
      player.buffs.fleetCommandUntil = state.time + 10 * ABILITY_POWER_MULT;
      player.cooldowns.command = 16;
      state.telemetry.counters.abilityUses += 1;
      addDebug(`Fleet Command: ${player.fleetCommandMode}`);
      logEvent("ability_use", { slot: 8, id: "fleet_command", mode: player.fleetCommandMode });
    }

    if (slot === 9 && player.cooldowns.mine <= 0) {
      state.entities.mines.push({ x: player.x, y: player.y, r: 16, t: 1.2, owner: "player" });
      player.cooldowns.mine = 9;
      state.telemetry.counters.abilityUses += 1;
      addDebug("Blink Mine armed");
      logEvent("ability_use", { slot: 9, id: "blink_mine" });
    }
  }

  function fleetShootVolley(targetX, targetY, baseAngle) {
    if (!state.entities.fleet.length) return;
    const commandActive = state.time < player.buffs.fleetCommandUntil;
    const focus = !commandActive || player.fleetCommandMode === "focus";
    for (const f of state.entities.fleet) {
      let tx = targetX;
      let ty = targetY;
      if (!focus && state.entities.enemies.length) {
        const e = state.entities.enemies[Math.floor(Math.random() * state.entities.enemies.length)];
        tx = e.x;
        ty = e.y;
      }
      const a = Math.atan2(ty - f.y, tx - f.x) + rand(-0.05, 0.05);
      const critMult = Math.random() < player.fleetCritChance ? player.critDamage : 1;
      shootBullet(f.x, f.y, tx + Math.cos(a) * 20, ty + Math.sin(a) * 20, "player", {
        speed: player.bulletSpeed * 0.95,
        range: player.range * 0.95,
        damage: player.attack * 0.48 * player.fleetDamageMult * critMult,
        size: player.bulletSize * 0.8,
        ricochet: Math.random() < 0.05
      });
    }
  }

  function updateFleet() {
    const targetCount = player.fleetCount + (state.time < player.buffs.summonFleetUntil ? 4 * ABILITY_POWER_MULT : 0);
    while (state.entities.fleet.length < targetCount) {
      state.entities.fleet.push({ hp: 50, maxHp: 50, x: player.x, y: player.y, angle: 0, cooldown: 0 });
    }
    if (state.entities.fleet.length > targetCount) state.entities.fleet.length = targetCount;

    const spacing = 36;
    for (let i = 0; i < state.entities.fleet.length; i++) {
      const f = state.entities.fleet[i];
      const wing = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2) + 1;
      const offsetX = -row * spacing;
      const offsetY = wing * row * spacing * 0.6;
      const tx = player.x + offsetX;
      const ty = player.y + offsetY;
      f.x += (tx - f.x) * 0.14;
      f.y += (ty - f.y) * 0.14;
      f.angle = Math.atan2(player.y - f.y, player.x - f.x);
    }
  }

  function updateMeleeOrbs() {
    const orbCount = getOrbCount();
    if (orbCount <= 0) return;
    const frenzy = state.time < player.buffs.orbFrenzyUntil;
    const choirBonus = state.entities.fleet.length >= 6 ? player.warChoir * 22 : 0;
    const rps = (player.meleeRPM + choirBonus) / 60 * (frenzy ? 2 : 1);
    player.orbitAngle += state.dt * (Math.PI * 2) * rps;
    for (let i = 0; i < orbCount; i++) {
      const a = player.orbitAngle + (Math.PI * 2 * i) / orbCount;
      const radius = 48 + player.shipSize + Math.sin(state.time * 2 + i) * 5;
      const ox = player.x + Math.cos(a) * radius;
      const oy = player.y + Math.sin(a) * radius;

      for (const e of state.entities.enemies) {
        const d = Math.hypot(e.x - ox, e.y - oy);
        if (d < e.size + 12) {
          e.hp -= player.meleeDamage * (frenzy ? 1.9 : 1.2) * state.dt;
          applyStatusProc(e, frenzy ? 0.95 : 0.18);
        }
      }
    }

    if (player.thermalShock > 0 && player.elements.has("Heat") && player.elements.has("Cold")) {
      if (state.time >= player.meleePulseAt) {
        player.meleePulseAt = state.time + Math.max(1.2, 3.2 - player.thermalShock * 0.6);
        const pulseR = 90 + player.thermalShock * 30;
        for (const e of state.entities.enemies) {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < pulseR) {
            e.hp -= 10 + player.thermalShock * 6;
            addStatusStack(e, "Blast", 1.6, 2);
          }
        }
      }
    }
  }

  function updatePlayer(dt) {
    const ix = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    const iy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    const len = Math.hypot(ix, iy) || 1;
    const speedBoost = state.time < player.buffs.speedFireUntil ? 1.2 : 1;
    player.vx = (ix / len) * player.shipSpeed * speedBoost;
    player.vy = (iy / len) * player.shipSpeed * speedBoost;
    const hasMoveInput = ix !== 0 || iy !== 0;
    const isMoving = hasMoveInput;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const nearest = findNearestEnemy(player.range * 2.4);
    if (nearest) {
      player.aimAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    } else {
      const m = worldFromScreen(mouse.x, mouse.y);
      player.aimAngle = Math.atan2(m.y - player.y, m.x - player.x);
    }
    player.renderAngle = player.aimAngle;
    player.idleSpinAngle = player.aimAngle;

    player.armor = Math.min(player.maxArmor, player.armor + player.armorRegen * dt);
    player.shieldRegenCooldown = Math.max(0, player.shieldRegenCooldown - dt);
    if (player.shieldRegenCooldown <= 0) {
      player.shield = Math.min(player.maxShield, player.shield + player.shieldRegen * dt);
    }
    playerShoot(dt, !isMoving);
    updateMeleeOrbs();

    for (const k of Object.keys(player.cooldowns)) {
      player.cooldowns[k] = Math.max(0, player.cooldowns[k] - dt);
    }

    // Camera follows ship and scales with velocity and ship size.
    const speed = Math.hypot(player.vx, player.vy);
    const mx = worldFromScreen(mouse.x, mouse.y);
    const ahead = clamp(speed / player.shipSpeed, 0, 1);
    const lookX = player.x + (mx.x - player.x) * 0.12 * ahead;
    const lookY = player.y + (mx.y - player.y) * 0.12 * ahead;
    state.camera.x += (lookX - state.camera.x) * 0.15;
    state.camera.y += (lookY - state.camera.y) * 0.15;

    const targetZoom = clamp(1.05 - player.shipSize * 0.007 - speed / 1800, 0.52, 1.15);
    state.camera.zoom += (targetZoom - state.camera.zoom) * 0.07;

    updateFleet();
  }

  function applyDamageToEnemy(enemy, dmg, hitX, hitY, bullet) {
    const crit = Math.random() < player.critChance;
    const markMult = enemy.markedUntil > state.time ? 1.4 : 1;
    const statusVuln = 1 + statusStacks(enemy, "Viral") * 0.1 + statusStacks(enemy, "Corrosive") * 0.08 + statusStacks(enemy, "Magnetic") * 0.05;
    const total = dmg * (crit ? player.critDamage : 1) * statusVuln * markMult;
    enemy.hp -= total;
    healPlayer(total * player.lifeSteal * 0.02);
    applyStatusProc(enemy, 0.36);

    if (bullet && bullet.explosive) {
      applyExplosionAoE(hitX, hitY, total * 0.7);
    }
  }

  function updateEnemies(dt) {
    for (const e of state.entities.enemies) {
      const statusMods = updateEnemyStatuses(e, dt);
      e.accuracyPenalty = statusMods.accuracyPenalty || 0;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const moveSpeed = e.speed * statusMods.speedMult;
      if (e.type === "kamikaze") {
        e.vx = nx * moveSpeed;
        e.vy = ny * moveSpeed;
      } else {
        const desired = e.preferredDistance;
        if (dist > desired + 35) {
          e.vx = nx * moveSpeed;
          e.vy = ny * moveSpeed;
        } else if (dist < desired - 35) {
          e.vx = -nx * moveSpeed * 0.9;
          e.vy = -ny * moveSpeed * 0.9;
        } else {
          e.vx = -ny * moveSpeed * 0.92 * e.orbitDir;
          e.vy = nx * moveSpeed * 0.92 * e.orbitDir;
        }
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (dist < player.shipSize + e.size + 2) {
        damagePlayer(e.contactDps * dt);
        e.hp -= 5 * dt;
      }
      enemyShoot(e, dist);
    }

    for (let i = state.entities.enemies.length - 1; i >= 0; i--) {
      const e = state.entities.enemies[i];
      if (e.hp > 0) continue;
      state.kills += 1;
      state.telemetry.counters.enemyKills += 1;
      const markedBonus = e.markedUntil > state.time ? 1.6 : 1;
      dropXpBits(e.x, e.y, e.xp * markedBonus);
      const dropChance = clamp((CARD_DROP_BASE_CHANCE + e.power * 0.0015 + player.luck * 0.0015 + player.cardDropLuck) * 1.3, 0.01, 0.3);
      if (Math.random() < dropChance) {
        dropCardShard(e.x, e.y, e.power);
      }
      if (player.markedEnemyId === e.id) player.markedEnemyId = null;
      state.entities.enemies.splice(i, 1);
    }
  }

  function updateXpBits(dt) {
    for (let i = state.entities.xpBits.length - 1; i >= 0; i--) {
      const b = state.entities.xpBits[i];
      b.life -= dt;
      b.magnetDelay = Math.max(0, b.magnetDelay - dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 0.92;
      b.vy *= 0.92;
      if (b.life <= 0) {
        state.entities.xpBits.splice(i, 1);
        continue;
      }
      const dist = Math.hypot(player.x - b.x, player.y - b.y);
      const magnetR = 240 * player.xpMagnet;
      if (dist < magnetR && b.magnetDelay <= 0) {
        const pull = (1 - dist / (210 * player.xpMagnet)) * 380 * player.xpMagnet;
        const dx = (player.x - b.x) / (dist || 1);
        const dy = (player.y - b.y) / (dist || 1);
        b.x += dx * pull * dt;
        b.y += dy * pull * dt;
      }
      if (dist < player.shipSize + b.r + 3) {
        gainXp(b.value);
        state.entities.xpBits.splice(i, 1);
      }
    }
  }

  function updateBullets(dt) {
    for (const arrName of ["playerBullets", "enemyBullets"]) {
      const arr = state.entities[arrName];
      for (let i = arr.length - 1; i >= 0; i--) {
        const b = arr[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0) {
          arr.splice(i, 1);
          continue;
        }

        if (b.source === "player") {
          for (const e of state.entities.enemies) {
            const d = Math.hypot(e.x - b.x, e.y - b.y);
            if (d < e.size + b.size) {
              applyDamageToEnemy(e, b.dmg, b.x, b.y, b);
              if (player.forkChance > 0 && Math.random() < player.forkChance) {
                const a = Math.atan2(b.vy, b.vx);
                for (const da of [-0.42, 0.42]) {
                  shootBullet(b.x, b.y, b.x + Math.cos(a + da) * 35, b.y + Math.sin(a + da) * 35, "player", {
                    speed: Math.hypot(b.vx, b.vy) * 0.95,
                    range: player.range * 0.55,
                    damage: b.dmg * 0.45,
                    size: Math.max(1.5, b.size * 0.75)
                  });
                }
              }
              if (b.ricochet) {
                const near = state.entities.enemies.find(other => other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 120);
                if (near) applyDamageToEnemy(near, b.dmg * 0.65, near.x, near.y, b);
              }
              if (b.pierce > 0) {
                b.pierce -= 1;
                b.dmg *= 0.8;
                b.x += b.vx * dt * 0.4;
                b.y += b.vy * dt * 0.4;
              } else {
                arr.splice(i, 1);
              }
              break;
            }
          }
        } else {
          const d = Math.hypot(player.x - b.x, player.y - b.y);
          if (d < player.shipSize + b.size) {
            damagePlayer(b.dmg);
            arr.splice(i, 1);
          }
        }
      }
    }
  }

  function updateDrops(dt) {
    for (let i = state.entities.drops.length - 1; i >= 0; i--) {
      const d = state.entities.drops[i];
      d.life -= dt;
      if (d.life <= 0) {
        state.entities.drops.splice(i, 1);
        continue;
      }
      const dist = Math.hypot(player.x - d.x, player.y - d.y);
      if (dist < 180) {
        const pull = (1 - dist / 180) * 400;
        const dx = (player.x - d.x) / (dist || 1);
        const dy = (player.y - d.y) / (dist || 1);
        d.x += dx * pull * dt;
        d.y += dy * pull * dt;
      }
      if (dist < player.shipSize + d.r + 4) {
        state.cardShards += 1;
        grantRandomCard(d.power, "drop");
        state.entities.drops.splice(i, 1);
      }
    }
  }

  function updateMines(dt) {
    for (let i = state.entities.mines.length - 1; i >= 0; i--) {
      const m = state.entities.mines[i];
      m.t -= dt;
      let explode = m.t <= 0;
      if (!explode) {
        for (const e of state.entities.enemies) {
          if (Math.hypot(e.x - m.x, e.y - m.y) < e.size + m.r) {
            explode = true;
            break;
          }
        }
      }
      if (!explode) continue;
      applyExplosionAoE(m.x, m.y, 24 * ABILITY_POWER_MULT * 1.8, "rgba(255, 122, 94, 0.9)");
      state.entities.mines.splice(i, 1);
    }
  }

  function updateSpawn() {
    if (state.time < state.nextSpawnAt) return;
    const targetBase = 9 + Math.floor(state.time / 30) + Math.floor(player.level * 1.1);
    const target = clamp(targetBase + Math.floor(state.kills / 35), 8, 70);
    const alive = state.entities.enemies.length;
    const deficit = target - alive;
    if (deficit <= 0) {
      state.nextSpawnAt = state.time + 0.35;
      return;
    }
    const amount = clamp(1 + Math.floor(deficit / 8), 1, 4);
    const waveInfo = spawnEnemy(amount);
    state.telemetry.wave += 1;
    logEvent("wave_spawn", {
      wave: state.telemetry.wave,
      amount,
      target,
      alive,
      kamikaze: waveInfo.kamikazeCount,
      ranged: waveInfo.rangedCount,
      dart: waveInfo.dartCount
    });
    state.nextSpawnAt = state.time + clamp(0.55 - state.time * 0.0006, 0.22, 0.55);
  }

  function updateBlasts(dt) {
    for (let i = state.entities.blasts.length - 1; i >= 0; i--) {
      const b = state.entities.blasts[i];
      b.life -= dt;
      if (b.life <= 0) {
        state.entities.blasts.splice(i, 1);
      }
    }
  }

  function drawGrid() {
    const left = state.camera.x - canvas.width / state.camera.zoom / 2;
    const right = state.camera.x + canvas.width / state.camera.zoom / 2;
    const top = state.camera.y - canvas.height / state.camera.zoom / 2;
    const bottom = state.camera.y + canvas.height / state.camera.zoom / 2;

    const startX = Math.floor(left / GRID) * GRID;
    const startY = Math.floor(top / GRID) * GRID;

    ctx.strokeStyle = "rgba(126, 172, 255, 0.12)";
    ctx.lineWidth = 1;

    for (let x = startX; x < right; x += GRID) {
      const a = toScreen(x, top);
      const b = toScreen(x, bottom);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (let y = startY; y < bottom; y += GRID) {
      const a = toScreen(left, y);
      const b = toScreen(right, y);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Development tile naming: each visible tile gets a stable coordinate id.
    const minTx = Math.floor(left / GRID);
    const maxTx = Math.floor(right / GRID);
    const minTy = Math.floor(top / GRID);
    const maxTy = Math.floor(bottom / GRID);
    ctx.fillStyle = "rgba(180, 210, 255, 0.42)";
    ctx.font = `${Math.max(10, 12 * state.camera.zoom)}px monospace`;
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const cx = tx * GRID + GRID * 0.5;
        const cy = ty * GRID + GRID * 0.5;
        const p = toScreen(cx, cy);
        ctx.fillText(`T_${tx}_${ty}`, p.x - 24 * state.camera.zoom, p.y + 4 * state.camera.zoom);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    for (const d of state.entities.drops) {
      const p = toScreen(d.x, d.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, d.r * state.camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = ELEMENT_COLORS[d.element] || "#fff";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }

    for (const m of state.entities.mines) {
      const p = toScreen(m.x, m.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, m.r * state.camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 120, 80, 0.25)";
      ctx.fill();
      ctx.strokeStyle = "#ff7a5e";
      ctx.stroke();
    }

    for (const xpb of state.entities.xpBits) {
      const p = toScreen(xpb.x, xpb.y);
      const r = xpb.r * state.camera.zoom;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.9, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 216, 79, 0.2)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd84f";
      ctx.fill();
      ctx.strokeStyle = "#fff2b0";
      ctx.stroke();
    }

    for (const b of state.entities.blasts) {
      const p = toScreen(b.x, b.y);
      const t = b.life / b.maxLife;
      const r = b.radius * (1.1 - t * 0.35) * state.camera.zoom;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = Math.max(0, t);
      ctx.lineWidth = Math.max(1.5, 3.5 * state.camera.zoom);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const b of state.entities.playerBullets) {
      const p = toScreen(b.x, b.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, b.size * state.camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = b.explosive ? "#ffb267" : "#c7efff";
      ctx.fill();
    }

    for (const b of state.entities.enemyBullets) {
      const p = toScreen(b.x, b.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, b.size * state.camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4f82";
      ctx.fill();
    }

    for (const e of state.entities.enemies) {
      const ang = Math.atan2(player.y - e.y, player.x - e.x);
      const enemyColor = e.type === "kamikaze" ? "#ff875e" : e.type === "dart" ? "#f6ff7b" : "#ff6fda";
      drawShip(e.x, e.y, e.size, enemyColor, ang);
      const status = ensureEnemyStatus(e);
      let topStatus = null;
      let topStacks = 0;
      for (const key of STATUS_KEYS) {
        if (status[key].stacks > topStacks) {
          topStacks = status[key].stacks;
          topStatus = key;
        }
      }
      if (topStatus) {
        const ep = toScreen(e.x, e.y);
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, (e.size + 5) * state.camera.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = ELEMENT_COLORS[topStatus];
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (e.markedUntil > state.time) {
        const ep = toScreen(e.x, e.y);
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, (e.size + 10) * state.camera.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffef72";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const p = toScreen(e.x, e.y - e.size - 12);
      const w = Math.max(28, e.size * 2.4) * state.camera.zoom;
      const h = Math.max(4, 5 * state.camera.zoom);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(p.x - w / 2, p.y, w, h);
      ctx.fillStyle = "#ff677f";
      ctx.fillRect(p.x - w / 2, p.y, w * clamp(e.hp / e.maxHp, 0, 1), h);
      if (e.maxHp > 800) {
        ctx.fillStyle = "#ffd7df";
        ctx.font = `${Math.max(9, 10 * state.camera.zoom)}px monospace`;
        ctx.fillText(`${Math.ceil(e.hp)}`, p.x - w / 2, p.y - 2);
      }
    }

    const orbCount = getOrbCount();
    for (let i = 0; i < orbCount; i++) {
      const a = player.orbitAngle + (Math.PI * 2 * i) / orbCount;
      const radius = 42 + player.shipSize + Math.sin(state.time * 2 + i) * 4;
      const x = player.x + Math.cos(a) * radius;
      const y = player.y + Math.sin(a) * radius;
      const p = toScreen(x, y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 * state.camera.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#b6fff5";
      ctx.fill();
      ctx.strokeStyle = "#68d1ff";
      ctx.stroke();
    }

    for (const f of state.entities.fleet) {
      drawShip(f.x, f.y, 9, "#84ffe1", f.angle);
    }

    drawShip(player.x, player.y, player.shipSize, "#75b6ff", player.renderAngle);

    if (state.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px Trebuchet MS";
      ctx.fillText("GAME OVER", canvas.width / 2 - 130, canvas.height / 2 - 20);
      ctx.font = "20px Trebuchet MS";
      if (state.prestige.spins > 0) {
        ctx.fillText(`Prestige Buff Offers (${state.prestige.spins} spins): press 7/8/9`, canvas.width / 2 - 275, canvas.height / 2 + 20);
        for (let i = 0; i < state.prestige.offers.length; i++) {
          const offer = state.prestige.offers[i];
          ctx.fillStyle = offer.color;
          ctx.fillText(`${7 + i}: ${offer.label} (${offer.stat})`, canvas.width / 2 - 230, canvas.height / 2 + 50 + i * 24);
        }
        ctx.fillStyle = "#ffffff";
      } else {
        const restartIn = Math.max(0, ((state.autoRestartAtMs - state.nowMs) / 1000));
        ctx.fillText(`Auto restart in ${restartIn.toFixed(1)}s (cards kept)`, canvas.width / 2 - 170, canvas.height / 2 + 20);
      }
    }

    if (state.debug) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(10, canvas.height - 170, 460, 160);
      ctx.font = "12px monospace";
      ctx.fillStyle = "#8effcb";
      ctx.fillText("SCHIZO DEBUG ON", 20, canvas.height - 148);
      const lines = [
        `time=${state.time.toFixed(1)} dt=${state.dt.toFixed(3)} paused=${state.paused}`,
        `player=(${player.x.toFixed(0)},${player.y.toFixed(0)}) spd=${Math.hypot(player.vx, player.vy).toFixed(1)} mode=${player.mode}`,
        `enemies=${state.entities.enemies.length} pBullets=${state.entities.playerBullets.length} eBullets=${state.entities.enemyBullets.length}`,
        `drops=${state.entities.drops.length} fleet=${state.entities.fleet.length} kills=${state.kills}`,
        `challenge=x${CHALLENGE_MULTIPLIER} cardDropBase=${CARD_DROP_BASE_CHANCE}`,
        `logs=${state.telemetry.events.length} wave=${state.telemetry.wave}`,
        `prestige score=${Math.floor(state.prestige.score)} spins=${state.prestige.spins} nodes=${state.prestige.tree.length}`,
        `cd[dash:${player.cooldowns.dash.toFixed(1)} spd:${player.cooldowns.speed.toFixed(1)} fleet:${player.cooldowns.fleet.toFixed(1)}]`,
        `elements=[${Array.from(player.elements).join(", ")}]`,
        `combos=[${Array.from(player.combos).join(", ")}]`
      ];
      lines.push(...state.debugLines.slice(-4));
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 20, canvas.height - 130 + i * 16);
      }
    }
  }

  function renderBuffPanel() {
    const chips = [];
    chips.push(`<span class="buff-chip" style="border-color:#ffe08a;color:#ffe08a">Prestige ${Math.floor(state.prestige.score)} / ${state.prestige.nextSpinAt}</span>`);
    chips.push(`<span class="buff-chip" style="border-color:#ffd166;color:#ffd166">Spins ${state.prestige.spins}</span>`);
    for (const e of player.elements) {
      chips.push(`<span class="buff-chip" style="border-color:${ELEMENT_COLORS[e]};color:${ELEMENT_COLORS[e]}">${e}</span>`);
    }
    for (const c of player.combos) {
      chips.push(`<span class="buff-chip" style="border-color:${ELEMENT_COLORS[c]};color:${ELEMENT_COLORS[c]}">${c}</span>`);
    }
    if (state.time < player.buffs.speedFireUntil) {
      chips.push(`<span class="buff-chip" style="border-color:#ffd166;color:#ffd166">Speed Buff</span>`);
    }
    if (state.time < player.buffs.overclockUntil) {
      chips.push(`<span class="buff-chip" style="border-color:#ffb26a;color:#ffb26a">Overclock</span>`);
    }
    if (state.time < player.buffs.orbFrenzyUntil) {
      chips.push(`<span class="buff-chip" style="border-color:#b6fff5;color:#b6fff5">Orb Frenzy</span>`);
    }
    if (state.time < player.buffs.fleetCommandUntil) {
      chips.push(`<span class="buff-chip" style="border-color:#84ffe1;color:#84ffe1">Fleet ${player.fleetCommandMode}</span>`);
    }
    chips.push(`<span class="buff-chip" style="border-color:#ffb26a;color:#ffb26a">Explosive ${Math.round(clamp(player.explosiveChance, 0, 0.9) * 100)}%</span>`);
    const shieldText = player.shieldRegenCooldown > 0 ? `Shield CD ${player.shieldRegenCooldown.toFixed(1)}s` : "Shield Recharging";
    chips.push(`<span class="buff-chip" style="border-color:#8df3ff;color:#8df3ff">${shieldText}</span>`);
    if (state.prestige.lastNode) {
      const node = state.prestige.tree.find((n) => n.id === state.prestige.lastNode);
      if (node) chips.push(`<span class="buff-chip" style="border-color:${node.color};color:${node.color}">Tree ${node.label} ${node.stat} R${node.rank}</span>`);
    }
    const html = chips.join("");
    if (state.ui.buffCache !== html) {
      state.ui.buffCache = html;
      buffPanel.innerHTML = html;
    }
  }

  function updateHud() {
    hpBar.style.width = `${clamp((player.hp / player.maxHp) * 100, 0, 100)}%`;
    shieldBar.style.width = `${clamp((player.shield / player.maxShield) * 100, 0, 100)}%`;
    armorBar.style.width = `${clamp((player.armor / player.maxArmor) * 100, 0, 100)}%`;
    xpBar.style.width = `${clamp((player.xp / player.xpToNext) * 100, 0, 100)}%`;

    statsText.textContent = [
      `Lvl ${player.level} | XP ${player.xp.toFixed(0)}/${player.xpToNext} | Kills ${state.kills}`,
      `ATK ${player.attack.toFixed(1)} | SHD ${player.shield.toFixed(0)} | ARM ${player.armor.toFixed(0)} | HP ${player.hp.toFixed(0)}`,
      `Crit ${Math.round(player.critChance * 100)}% x${player.critDamage.toFixed(2)} | Luck ${player.luck.toFixed(2)}`,
      `ShipSpd ${player.shipSpeed.toFixed(0)} | BulletSpd ${player.bulletSpeed.toFixed(0)} | Range ${player.range.toFixed(0)}`,
      `Melee ${player.meleeUnlocked ? "ON" : "OFF"} | Orbs ${getOrbCount()} | Orb RPM ${player.meleeRPM.toFixed(0)}`,
      `Size ship ${player.shipSize.toFixed(1)} bullet ${player.bulletSize.toFixed(1)} | Cards ${state.totalCards}`,
      `XP Bits ${state.entities.xpBits.length} | Ground Cards ${state.entities.drops.length}`,
      `Prestige Score ${Math.floor(state.prestige.score)} | Spins ${state.prestige.spins} (after death 7/8/9)`,
      `Revive ${player.reviveCharges} | Mode ${player.mode.toUpperCase()} (R toggles)`
    ].join("\n");
    renderBuffPanel();
  }

  function tick(ts) {
    if (!tick.last) tick.last = ts;
    const dt = Math.min((ts - tick.last) / 1000, 0.04);
    tick.last = ts;
    state.nowMs = ts;
    state.dt = dt;

    if (!state.paused) {
      if (!state.gameOver) {
        state.time += dt;
        updatePlayer(dt);
        updateEnemies(dt);
        updateBullets(dt);
        updateDrops(dt);
        updateMines(dt);
        updateBlasts(dt);
        updateXpBits(dt);
        updateSpawn();
        if (state.time - state.telemetry.lastSnapshotAt >= 1) {
          state.telemetry.lastSnapshotAt = state.time;
          logEvent("snapshot", {
            hp: Number(player.hp.toFixed(1)),
            armor: Number(player.armor.toFixed(1)),
            enemies: state.entities.enemies.length,
            bulletsEnemy: state.entities.enemyBullets.length,
            bulletsPlayer: state.entities.playerBullets.length,
            kills: state.kills
          });
        }
      } else if (state.prestige.spins <= 0 && state.nowMs >= state.autoRestartAtMs) {
        resetRunKeepCards();
      }
    }

    draw();
    updateHud();
    requestAnimationFrame(tick);
  }

  function resetRunKeepCards() {
    logEvent("run_reset", { keptCards: state.totalCards, level: player.level });
    player.x = 0;
    player.y = 0;
    player.vx = 0;
    player.vy = 0;
    player.hp = player.maxHp;
    player.armor = player.maxArmor;
    player.shield = player.maxShield;
    player.reviveCharges = 1;
    player.nextShotExplosive = false;
    player.explosiveShotsQueued = 0;
    player.buffs.speedFireUntil = 0;
    player.buffs.summonFleetUntil = 0;
    for (const k of Object.keys(player.cooldowns)) player.cooldowns[k] = 0;
    state.entities.playerBullets.length = 0;
    state.entities.enemyBullets.length = 0;
    state.entities.enemies.length = 0;
    state.entities.drops.length = 0;
    state.entities.xpBits.length = 0;
    state.entities.mines.length = 0;
    state.entities.blasts.length = 0;
    state.entities.fleet.length = 0;
    state.gameOver = false;
    state.awaitingPrestigeSpin = false;
    state.prestige.offers = [];
    state.ui.recentCards = [];
    renderCardTray();
    state.kills = 0;
    state.time = 0;
    state.nextSpawnAt = 0;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mousedown", () => { mouse.down = true; });
  window.addEventListener("mouseup", () => { mouse.down = false; });

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);

    if (k === "f3") {
      e.preventDefault();
      state.debug = !state.debug;
    }
    if (k === "p") state.paused = !state.paused;
    if (k === "1") useAbility(1);
    if (k === "2") useAbility(2);
    if (k === "3") useAbility(3);
    if (k === "4") useAbility(4);
    if (k === "q") useAbility(5);
    if (k === "e") useAbility(6);
    if (k === "f") useAbility(7);
    if (k === "g") useAbility(8);
    if (k === "z") useAbility(9);
    if (k === "5") spinPrestigeTree();
    if (k === "7") spinPrestigeTree(0);
    if (k === "8") spinPrestigeTree(1);
    if (k === "9") spinPrestigeTree(2);
    if (k === "r") player.mode = player.mode === "assault" ? "sniper" : "assault";
    if (k === "enter" && state.gameOver) resetRunKeepCards();
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  resize();
  attachTelemetryApi();
  logEvent("session_start", { challenge: CHALLENGE_MULTIPLIER });
  spawnEnemy(8);
  requestAnimationFrame(tick);
})();

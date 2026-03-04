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
  const cardPanel = document.getElementById("cardPanel");

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
  const ENEMY_BULLET_SPEED_MULT = 0.78078;
  const PRESTIGE_SPIN_SCORE = 1000;
  const ABILITY_POWER_MULT = 3;
  const ELEMENT_POWER_MULT = 3; // +200%
  const PRESTIGE_BUFF_MULT = 2.25; // +125%
  const ENEMY_CAP = 125;
  const DEATH_SPAWN_COUNT = 3;
  const XP_GAIN_MULT = 1.75; // +75%

  const RARITIES = [
    { name: "Common", color: "#4e79a7", weight: 88 },
    { name: "Uncommon", color: "#59a14f", weight: 10 },
    { name: "Rare", color: "#e15759", weight: 1.8 },
    { name: "Prime", color: "#f28e2b", weight: 0.18 },
    { name: "Satanic", color: "#b31f5c", weight: 0.02 }
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

  const STATUS_KEYS = ["Heat", "Cold", "Toxin", "Electricity", "Viral", "Corrosive", "Radiation", "Magnetic", "Blast"];
  const STATUS_LABELS = {
    Heat: "🔥 HEAT",
    Cold: "🧊 COLD",
    Toxin: "☠️ TOXIN",
    Electricity: "⚡ ZAP",
    Viral: "🦠 VIRAL",
    Corrosive: "🧪 CORROSIVE",
    Radiation: "☢️ RAD",
    Magnetic: "🧲 MAG",
    Blast: "💥 BLAST"
  };

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
    { id: "warChoir", label: "War Choir", apply: (p, amt) => p.warChoir += amt * 0.2, desc: "Fleet>=6 boosts status/melee" },
    { id: "deathNova", label: "Death Nova", apply: (p, amt) => { p.deathNovaChance += amt * 0.02; p.deathNovaRadius += amt * 0.08; }, desc: "Kills can explode" },
    { id: "killSurge", label: "Kill Surge", apply: (p, amt) => p.killSurge += amt * 0.22, desc: "Kills boost fire speed" },
    { id: "cardMutator", label: "Card Mutator", apply: (p, amt) => p.cardMutator += amt * 0.08, desc: "Cards can gain extra trait" },
    { id: "fateDice", label: "Fate Dice", apply: (p, amt) => p.fateDice += amt * 0.04, desc: "Chance to rarity reroll" },
    { id: "guardianPulse", label: "Guardian Pulse", apply: (p, amt) => p.guardianPulse += amt * 0.12, desc: "Hit triggers shockwave" }
  ];
  const PRESTIGE_POOL = [
    { id: "p_attack", label: "Edge Core", stat: "+1.35 ATK", color: "#ff8c3b", apply: (p) => p.attack += 0.6 * PRESTIGE_BUFF_MULT },
    { id: "p_hp", label: "Hull Weave", stat: "+9 HP", color: "#ff4d6d", apply: (p) => { p.maxHp += 4 * PRESTIGE_BUFF_MULT; p.hp += 4 * PRESTIGE_BUFF_MULT; } },
    { id: "p_armor", label: "Plate Rivet", stat: "+6.75 Armor", color: "#7ab8ff", apply: (p) => { p.maxArmor += 3 * PRESTIGE_BUFF_MULT; p.armor += 3 * PRESTIGE_BUFF_MULT; } },
    { id: "p_shield", label: "Capacitor", stat: "+9 Shield", color: "#8df3ff", apply: (p) => { p.maxShield += 4 * PRESTIGE_BUFF_MULT; p.shield += 4 * PRESTIGE_BUFF_MULT; } },
    { id: "p_shield_regen", label: "Recharge Coil", stat: "+1.0125 Shield Regen", color: "#6ef7ff", apply: (p) => p.shieldRegen += 0.45 * PRESTIGE_BUFF_MULT },
    { id: "p_speed", label: "Thruster", stat: "+13.5 Ship Speed", color: "#ffd166", apply: (p) => p.shipSpeed += 6 * PRESTIGE_BUFF_MULT },
    { id: "p_range", label: "Long Scope", stat: "+22.5 Range", color: "#d6c8ff", apply: (p) => p.range += 10 * PRESTIGE_BUFF_MULT },
    { id: "p_fire", label: "Autoloader", stat: "+0.27 Fire Rate", color: "#ffb26a", apply: (p) => p.fireRate += 0.12 * PRESTIGE_BUFF_MULT },
    { id: "p_critc", label: "Lucky Edge", stat: "+0.675% Crit", color: "#9effa9", apply: (p) => p.critChance += 0.003 * PRESTIGE_BUFF_MULT },
    { id: "p_critd", label: "Weakpoint", stat: "+0.045 Crit Dmg", color: "#f7a8ff", apply: (p) => p.critDamage += 0.02 * PRESTIGE_BUFF_MULT },
    { id: "p_melee", label: "Orb Wire", stat: "+1.125 Melee Dmg", color: "#b6fff5", apply: (p) => p.meleeDamage += 0.5 * PRESTIGE_BUFF_MULT },
    { id: "p_lifesteal", label: "Leech Lattice", stat: "+0.0045 Life Steal", color: "#88ffb4", apply: (p) => p.lifeSteal += 0.002 * PRESTIGE_BUFF_MULT },
    { id: "p_bsize", label: "Payload", stat: "+0.18 Bullet Size", color: "#ffd2a6", apply: (p) => p.bulletSize += 0.08 * PRESTIGE_BUFF_MULT },
    { id: "p_bspeed", label: "Pulse Driver", stat: "+15.75 Bullet Speed", color: "#ffe08a", apply: (p) => p.bulletSpeed += 7 * PRESTIGE_BUFF_MULT },
    { id: "p_luck", label: "Fate Wire", stat: "+0.09 Luck", color: "#ceff8b", apply: (p) => p.luck += 0.04 * PRESTIGE_BUFF_MULT }
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
      offers: [],
      roulette: {
        active: false,
        index: 0,
        batchSize: 1,
        nextTickAtMs: 0,
        stopAtMs: 0,
        nextAutoSpinAtMs: 0
      }
    },
    debugLines: [],
    deathLog: [],
    lastDeathSummary: [],
    randomizer: {
      seed: 0,
      enemyHp: 1,
      enemySpeed: 1,
      enemyBulletSpeed: 1,
      enemyDamage: 1,
      dropRate: 1,
      xpGain: 1
    },
    ui: {
      buffCache: "",
      recentCards: [],
      levelDraft: {
        active: false,
        options: [],
        rolling: false,
        revealing: false,
        index: 0,
        nextTickAtMs: 0,
        stopAtMs: 0,
        revealUntilMs: 0,
        queue: []
      }
    }
  };

  function makeBasePlayer() {
    return {
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
      luck: 1.5,
      xp: 0,
      level: 1,
      xpToNext: 1000,
      shipSpeed: 360,
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
      deathNovaChance: 0,
      deathNovaRadius: 1,
      killSurge: 0,
      cardMutator: 0,
      fateDice: 0,
      guardianPulse: 0,
      lastGuardianPulseAt: -9999,
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
      elements: new Set()
    };
  }

  const player = makeBasePlayer();

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function rollRandomizerProfile() {
    state.randomizer.seed = Math.floor(Math.random() * 1_000_000);
    state.randomizer.enemyHp = rand(0.85, 1.35);
    state.randomizer.enemySpeed = rand(0.75, 1.25);
    state.randomizer.enemyBulletSpeed = rand(0.75, 1.35);
    state.randomizer.enemyDamage = rand(0.8, 1.3);
    state.randomizer.dropRate = rand(0.7, 1.4);
    state.randomizer.xpGain = rand(0.85, 1.3);
    addDebug(
      `RNG seed ${state.randomizer.seed} HPx${state.randomizer.enemyHp.toFixed(2)} SPDx${state.randomizer.enemySpeed.toFixed(2)}`
    );
    logEvent("randomizer_roll", {
      seed: state.randomizer.seed,
      enemyHp: Number(state.randomizer.enemyHp.toFixed(3)),
      enemySpeed: Number(state.randomizer.enemySpeed.toFixed(3)),
      enemyBulletSpeed: Number(state.randomizer.enemyBulletSpeed.toFixed(3)),
      enemyDamage: Number(state.randomizer.enemyDamage.toFixed(3)),
      dropRate: Number(state.randomizer.dropRate.toFixed(3)),
      xpGain: Number(state.randomizer.xpGain.toFixed(3))
    });
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

  function pickCardModWeighted() {
    // Make fleet path easier to build.
    const weighted = CARD_POOL.map((mod) => {
      let weight = 1;
      if (mod.id === "fleet") weight = 4.2;
      else if (mod.id === "fleetDmg" || mod.id === "fleetCrit" || mod.id === "fleetStatus") weight = 2.2;
      return { mod, weight };
    });
    const total = weighted.reduce((n, x) => n + x.weight, 0);
    let r = Math.random() * total;
    for (const item of weighted) {
      r -= item.weight;
      if (r <= 0) return item.mod;
    }
    return weighted[0].mod;
  }

  function rarityBase(name) {
    return name === "Common" ? 1 : name === "Uncommon" ? 1.5 : name === "Rare" ? 2.3 : name === "Prime" ? 3.2 : 4.5;
  }

  function numberText(v, suffix = "") {
    const abs = Math.abs(v);
    const precision = abs >= 10 ? 1 : 2;
    const sign = v >= 0 ? "+" : "";
    return `${sign}${v.toFixed(precision)}${suffix}`;
  }

  function traitValueText(mod, amount) {
    switch (mod.id) {
      case "attack": return `ATK ${numberText(amount * 1.2)}`;
      case "armor": return `ARMOR ${numberText(amount * 6)}`;
      case "health": return `HP ${numberText(amount * 10)}`;
      case "critChance": return `CRIT% ${numberText(amount * 1.5, "%")}`;
      case "critDamage": return `CRIT DMG ${numberText(amount * 0.08)}`;
      case "luck": return `LUCK ${numberText(amount * 0.18)}`;
      case "shipSpeed": return `SHIP SPD ${numberText(amount * 15)}`;
      case "bulletSpeed": return `BULLET SPD ${numberText(amount * 20)}`;
      case "bulletSize": return `BULLET SIZE ${numberText(amount * 0.35)}`;
      case "shipSize": return `SHIP SIZE ${numberText(amount * 0.4)}`;
      case "range": return `RANGE ${numberText(amount * 22)}`;
      case "meleeDamage": return `MELEE DMG ${numberText(amount * 1.5)} | RPM ${numberText(Math.max(2, amount * 4))}`;
      case "meleeRPM": return `MELEE RPM ${numberText(amount * 7)}`;
      case "attackSpeed": return `FIRE RATE ${numberText(amount * 0.35)}`;
      case "comboDuration": return `COMBO SEC ${numberText(amount * 0.9)}`;
      case "heavyEff": return `EXPLOSION RAD ${numberText(amount * 0.09)}`;
      case "explosiveRounds": return `EXPLOSIVE% ${numberText(amount * 2, "%")}`;
      case "lifeSteal": return `LIFESTEAL ${numberText(amount, "%")}`;
      case "fleet": return `FLEET SHIPS ${numberText(Math.max(1, Math.round(amount * 0.6)))}`;
      case "multi": return `MULTISHOT ${numberText(Math.max(1, Math.floor(amount / 2)))}`;
      case "shieldRegen": return `SHIELD REGEN ${numberText(amount * 0.4)} | SHIELD ${numberText(amount * 5)}`;
      case "statusRes": return `STATUS RES ${numberText(amount * 0.08)}`;
      case "pierce": return `PIERCE ${numberText(Math.max(1, Math.round(amount * 0.5)))}`;
      case "fork": return `FORK% ${numberText(amount * 5, "%")}`;
      case "heavySlug": return `DMG ${numberText(amount * 0.06)} | FIRE RATE ${numberText(-amount * 0.12)}`;
      case "statusEngine": return `STATUS CHANCE ${numberText(amount * 0.02)}`;
      case "statusPower": return `STATUS POWER ${numberText(amount * 0.08)}`;
      case "shieldGate": return `SHIELD GATE ${numberText(amount * 0.08, "s")}`;
      case "reactiveArmor": return `REACTIVE ARMOR ${numberText(amount * 0.12)}`;
      case "emergencyRepair": return `EMERGENCY REPAIR ${numberText(amount * 0.14)}`;
      case "fleetDmg": return `FLEET DMG ${numberText(amount * 0.08)}`;
      case "fleetCrit": return `FLEET CRIT% ${numberText(amount * 2, "%")}`;
      case "fleetStatus": return `FLEET STATUS% ${numberText(amount * 3, "%")}`;
      case "xpMagnet": return `XP MAGNET ${numberText(amount * 0.12)}`;
      case "prestigeGain": return `PRESTIGE GAIN ${numberText(amount * 0.09)}`;
      case "cardLuck": return `CARD DROP% ${numberText(amount * 2, "%")}`;
      case "rareBias": return `RARITY BIAS ${numberText(amount * 0.02)}`;
      default: return `POWER ${numberText(amount)} ${mod.label}`;
    }
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

  function triggerGuardianPulse() {
    if (player.guardianPulse <= 0) return;
    if (state.time - player.lastGuardianPulseAt < 3.5) return;
    player.lastGuardianPulseAt = state.time;
    const r = 120 + player.guardianPulse * 45;
    spawnBlastFx(player.x, player.y, r, "rgba(141, 243, 255, 0.9)");
    for (const e of state.entities.enemies) {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < r) {
        const n = (r - d) / r;
        e.x += (dx / d) * n * 110;
        e.y += (dy / d) * n * 110;
        e.hp -= 10 * n * (1 + player.guardianPulse * 0.6);
      }
    }
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

  function getPrestigeNodeById(id) {
    return PRESTIGE_POOL.find((n) => n.id === id) || null;
  }

  function resetPlayerForNewRun() {
    const fresh = makeBasePlayer();
    for (const nodeEntry of state.prestige.tree) {
      const node = getPrestigeNodeById(nodeEntry.id);
      if (!node) continue;
      for (let i = 0; i < nodeEntry.rank; i++) {
        node.apply(fresh);
      }
    }
    for (const key of Object.keys(player)) {
      delete player[key];
    }
    Object.assign(player, fresh);
  }

  function startPrestigeRouletteSpin() {
    if (!state.gameOver || state.prestige.spins <= 0 || state.prestige.roulette.active) return;
    const megaSpin = state.prestige.spins > 5;
    const offerCount = megaSpin ? 10 : 5;
    const batchSize = megaSpin ? Math.min(10, state.prestige.spins) : 1;
    const pool = PRESTIGE_POOL.slice().sort(() => Math.random() - 0.5).slice(0, offerCount);
    state.prestige.offers = pool.map((n) => ({ id: n.id, label: n.label, stat: n.stat, color: n.color }));
    state.prestige.roulette.active = true;
    state.prestige.roulette.index = 0;
    state.prestige.roulette.batchSize = batchSize;
    state.prestige.roulette.nextTickAtMs = state.nowMs + 60;
    state.prestige.roulette.stopAtMs = state.nowMs + (megaSpin ? 2200 : 1700);
  }

  function updatePrestigeRoulette() {
    if (!state.prestige.roulette.active) {
      if (state.gameOver && state.prestige.spins > 0 && state.nowMs >= state.prestige.roulette.nextAutoSpinAtMs) {
        startPrestigeRouletteSpin();
      }
      return;
    }
    if (state.nowMs >= state.prestige.roulette.nextTickAtMs && state.prestige.offers.length) {
      state.prestige.roulette.index = (state.prestige.roulette.index + 1) % state.prestige.offers.length;
      state.prestige.roulette.nextTickAtMs = state.nowMs + 60;
    }
    if (state.nowMs < state.prestige.roulette.stopAtMs) return;

    const toApply = Math.min(state.prestige.roulette.batchSize || 1, state.prestige.spins);
    for (let i = 0; i < toApply; i++) {
      const idx = (state.prestige.roulette.index + i) % Math.max(1, state.prestige.offers.length);
      const selected = state.prestige.offers[idx];
      const node = selected ? getPrestigeNodeById(selected.id) : null;
      if (!node) continue;
      node.apply(player);
      state.prestige.spent += 1;
      state.prestige.lastNode = node.id;
      const existing = state.prestige.tree.find((n) => n.id === node.id);
      if (existing) existing.rank += 1;
      else state.prestige.tree.push({ id: node.id, label: node.label, stat: node.stat, rank: 1, color: node.color });
      addDebug(`Prestige spin: ${node.label}`);
      logEvent("prestige_spin", { node: node.id, label: node.label, left: Math.max(0, state.prestige.spins - (i + 1)) });
    }
    state.prestige.spins = Math.max(0, state.prestige.spins - toApply);
    state.prestige.roulette.active = false;
    state.prestige.roulette.batchSize = 1;
    state.prestige.roulette.nextAutoSpinAtMs = state.nowMs + 420;
    if (state.prestige.spins <= 0) {
      state.prestige.offers = [];
      state.autoRestartAtMs = state.nowMs + state.autoRestartDelayMs;
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
    triggerGuardianPulse();
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
        state.prestige.roulette.nextAutoSpinAtMs = state.nowMs + 250;
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
    // Instant power-up flow: no pickup object, apply card immediately.
    grantRandomCard(enemyPower, "kill-drop");
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
    if (v <= 0) return;
    addPrestigeScore(v * 2.4, "xp");
    player.xp += v;
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level += 1;
      player.xpToNext = 1000;
      addPrestigeScore(player.level * 12, "level");
      boostDifficultyOnLevelUp();
      addDebug(`LEVEL ${player.level}: enemy pressure up`);
      logEvent("level_up", { level: player.level, harderEnemies: true });
      openLevelDraft(1 + player.level * 0.08);
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
    const slots = Math.max(0, ENEMY_CAP - state.entities.enemies.length);
    const toSpawn = Math.min(amount, slots);
    if (toSpawn <= 0) return { kamikazeCount: 0, assaultCount: 0, sniperCount: 0, bossCount: 0 };
    let kamikazeCount = 0;
    let assaultCount = 0;
    let sniperCount = 0;
    let bossCount = 0;
    for (let i = 0; i < toSpawn; i++) {
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
      const bossChance = clamp(0.02 + state.time * 0.00015 + state.kills * 0.00003, 0.02, 0.1);
      const isBoss = Math.random() < bossChance;
      const roll = Math.random();
      const type = isBoss ? "boss" : (roll < 0.34 ? "kamikaze" : roll < 0.74 ? "assault" : "sniper");
      if (type === "kamikaze") kamikazeCount += 1;
      else if (type === "assault") assaultCount += 1;
      else if (type === "sniper") sniperCount += 1;
      else if (type === "boss") bossCount += 1;
      if (type === "sniper") scale *= rand(0.85, 1.35);
      if (type === "boss") scale *= rand(1.1, 1.4);
      const hpBase =
        type === "boss" ? 120 :
        type === "sniper" ? 24 :
        type === "assault" ? 30 :
        26;
      const hp = hpBase * difficulty * scale * hpScale * state.randomizer.enemyHp * 2.197;
      const baseSpeed =
        type === "boss"
          ? rand(18, 36) * moveDifficulty * speedScale
          :
        type === "kamikaze"
          ? rand(55, 105) * moveDifficulty * speedScale
          : type === "assault"
            ? rand(28, 56) * moveDifficulty * speedScale
            : type === "sniper"
              ? rand(18, 36) * moveDifficulty * speedScale
              : rand(44, 76) * moveDifficulty * speedScale;
      const bulletSizeRoll =
        type === "boss"
          ? rand(4.5, 8.5) * clamp(scale, 1.2, 2.8)
          :
        type === "sniper"
          ? rand(4.2, 9.2) * clamp(scale, 0.9, 2.4)
          : type === "assault"
            ? rand(2.5, 6.8) * clamp(scale, 0.9, 2.3)
            : rand(2.2, 5.2) * clamp(scale, 0.9, 2.4);
      const bulletSpeedFactor = 1 / (0.75 + bulletScale * 1.1);
      const sizeSlowFactor = 1 / (0.8 + bulletSizeRoll * 0.18);
      const canShoot = type === "assault" || type === "sniper" || type === "boss";
      const shootEvery =
        type === "boss"
          ? rand(0.75, 1.25) * fireScale
          :
        type === "assault"
          ? rand(0.24, 0.55) * fireScale
          : type === "sniper"
            ? rand(1.1, 2.1) * fireScale
            : rand(1.3, 2.5) * fireScale;
      const shootRange =
        type === "boss"
          ? rand(480, 760) * 2
          :
        type === "assault"
          ? rand(260, 480) * 2
          : type === "sniper"
            ? rand(560, 920) * 2
            : 0;
      const preferredDistance =
        type === "boss"
          ? rand(260, 420)
          :
        type === "assault"
          ? rand(150, 270)
          : type === "sniper"
            ? rand(410, 640)
            : 0;
      let multiShot = canShoot ? (Math.random() < 0.18 ? Math.floor(rand(2, 5)) : 1) : 1;
      const fireRateStat = canShoot ? rand(0.65, 1.9) : 1;
      let fireRateMult = canShoot ? rand(0.85, 1.35) : 1;
      if (canShoot && Math.random() < 0.22) {
        multiShot = Math.max(multiShot, Math.floor(rand(2, 6)));
        fireRateMult *= rand(1.6, 3);
      }
      if (type === "sniper") {
        multiShot = Math.min(multiShot, 2);
        fireRateMult = Math.min(fireRateMult, 1.8);
      }
      const resolvedShootEvery = Math.max(0.08, shootEvery / (fireRateMult * fireRateStat));
      const finalSpeed =
        type === "kamikaze"
          ? rand(40, 300) * state.randomizer.enemySpeed
          : baseSpeed * 0.2 * state.randomizer.enemySpeed;
      const normalMaxSize = 11 * Math.pow(2.8, 0.78) * 1.35;
      const resolvedSize = type === "boss" ? rand(normalMaxSize * 2.0, normalMaxSize * 2.5) : 11 * scale;
      state.entities.enemies.push({
        id: state.nextEnemyId++,
        x,
        y,
        vx: 0,
        vy: 0,
        type,
        size: resolvedSize,
        hp,
        maxHp: hp,
        speed: finalSpeed,
        bulletSize: bulletSizeRoll,
        bulletSpeed:
          (type === "sniper" ? rand(210, 330) : rand(165, 285)) *
          difficulty *
          bulletSpeedFactor *
          sizeSlowFactor *
          ENEMY_BULLET_SPEED_MULT *
          state.randomizer.enemyBulletSpeed,
        damage:
          (type === "sniper" ? rand(16, 30) : type === "assault" ? rand(6, 12) : rand(10, 18)) *
          difficulty *
          damageScale *
          state.randomizer.enemyDamage,
        ricochet: Math.random() < (0.18 + state.time * 0.0007),
        shootCd: rand(0.15, 1.1),
        shootEvery: resolvedShootEvery,
        fireRateStat,
        shootRange,
        preferredDistance,
        multiShot,
        orbitDir: Math.random() < 0.5 ? -1 : 1,
        canShoot,
        contactDps: type === "boss" ? 14 : type === "kamikaze" ? 28 : type === "assault" ? 6 : 4,
        meleeOrbCount: type === "melee" ? Math.floor(rand(2, 5)) : 0,
        meleeOrbRadius: type === "melee" ? rand(22, 42) : 0,
        meleeOrbRpm: type === "melee" ? rand(45, 105) : 0,
        meleeOrbDamage: type === "melee" ? rand(7, 15) * difficulty : 0,
        orbAngle: rand(0, Math.PI * 2),
        markedUntil: 0,
        status: null,
        patternPhase: rand(0, Math.PI * 2),
        xp: (8 + scale * 5 + hpScale * 2) * (type === "boss" ? 5 : 1),
        power: difficulty * scale
      });
    }
    return { kamikazeCount, assaultCount, sniperCount, bossCount };
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
    const nearest = findNearestEnemy(Infinity);
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
    enemy.shootCd = enemy.shootEvery * (enemy.type === "assault" ? rand(0.85, 1.15) : rand(0.95, 1.05));
    const radStacks = statusStacks(enemy, "Radiation");
    const miss = rand(-1, 1) * (radStacks * 28 + (enemy.accuracyPenalty || 0) * 42);
    const pellets = Math.max(1, enemy.multiShot || 1);
    if (enemy.type === "boss") {
      const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + (enemy.patternPhase || 0);
      const fan = [-0.9, -0.45, 0, 0.45, 0.9];
      let shotCount = 0;
      for (const side of [0, Math.PI]) {
        for (const spread of fan) {
          const a = baseAngle + side + spread;
          shootBullet(enemy.x, enemy.y, enemy.x + Math.cos(a) * 36, enemy.y + Math.sin(a) * 36, "enemy", {
            speed: enemy.bulletSpeed * rand(0.92, 1.08),
            range: enemy.shootRange * 1.35,
            damage: enemy.damage * 0.72,
            size: enemy.bulletSize * 0.95,
            ricochet: false
          });
          shotCount += 1;
        }
      }
      enemy.patternPhase = (enemy.patternPhase || 0) + 0.19;
      state.telemetry.counters.enemyShots += shotCount;
      return;
    }
    if (enemy.type === "assault") {
      const burst = Math.random() < 0.35 ? 2 : 1;
      let shotCount = 0;
      for (let i = 0; i < burst; i++) {
        for (let p = 0; p < pellets; p++) {
          const spread = pellets > 1 ? (p - (pellets - 1) / 2) * 0.09 : 0;
          const extraJitter = rand(-0.08, 0.08) + spread;
          shootBullet(enemy.x, enemy.y, player.x + miss + Math.cos(extraJitter) * 14, player.y + miss + Math.sin(extraJitter) * 14, "enemy", {
            speed: enemy.bulletSpeed * rand(0.94, 1.08),
            range: enemy.shootRange * 1.2,
            damage: enemy.damage * 0.78,
            size: enemy.bulletSize * 0.9,
            ricochet: enemy.ricochet
          });
          shotCount += 1;
        }
      }
      state.telemetry.counters.enemyShots += shotCount;
    } else {
      for (let p = 0; p < pellets; p++) {
        const spread = pellets > 1 ? (p - (pellets - 1) / 2) * 0.05 : 0;
        shootBullet(enemy.x, enemy.y, player.x + miss * 0.45 + Math.cos(spread) * 8, player.y + miss * 0.45 + Math.sin(spread) * 8, "enemy", {
          speed: enemy.bulletSpeed * 1.1,
          range: enemy.shootRange * 1.4,
          damage: enemy.damage * 1.35,
          size: enemy.bulletSize * 1.1,
          ricochet: enemy.ricochet
        });
      }
      state.telemetry.counters.enemyShots += pellets;
    }
  }

  function playerStatusPool() {
    const pool = [];
    for (const e of player.elements) {
      if (STATUS_KEYS.includes(e)) pool.push(e);
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

    // Heat: steady burn DoT.
    if (status.Heat.stacks > 0) {
      enemy.hp -= (3.2 + status.Heat.stacks * 1.8) * ELEMENT_POWER_MULT * dt;
    }
    // Toxin: stronger toxic DoT.
    if (status.Toxin.stacks > 0) {
      enemy.hp -= (3.8 + status.Toxin.stacks * 2.2) * ELEMENT_POWER_MULT * dt;
    }
    if (status.Cold.stacks > 0) {
      speedMult *= clamp(1 - status.Cold.stacks * 0.14 * ELEMENT_POWER_MULT, 0.12, 1);
      accuracyPenalty += 0.04 * status.Cold.stacks * ELEMENT_POWER_MULT;
    }
    if (status.Blast.stacks > 0) {
      speedMult *= clamp(0.22 / ELEMENT_POWER_MULT, 0.08, 0.22);
      accuracyPenalty += 0.35 * ELEMENT_POWER_MULT;
    }
    if (status.Viral.stacks > 0) {
      incomingMult += status.Viral.stacks * 0.1 * ELEMENT_POWER_MULT;
    }
    if (status.Corrosive.stacks > 0) {
      incomingMult += status.Corrosive.stacks * 0.08 * ELEMENT_POWER_MULT;
    }
    if (status.Magnetic.stacks > 0) {
      incomingMult += status.Magnetic.stacks * 0.05 * ELEMENT_POWER_MULT;
      accuracyPenalty += 0.05 * status.Magnetic.stacks * ELEMENT_POWER_MULT;
    }
    if (status.Radiation.stacks > 0) {
      accuracyPenalty += 0.12 * status.Radiation.stacks * ELEMENT_POWER_MULT;
      if (Math.random() < 0.03 * status.Radiation.stacks * ELEMENT_POWER_MULT) {
        enemy.orbitDir *= -1;
      }
    }
    if (status.Electricity.stacks > 0) {
      status.Electricity.pulseT -= dt;
      if (status.Electricity.pulseT <= 0) {
        status.Electricity.pulseT = 0.32;
        const chainDamage = (5 + status.Electricity.stacks * 2.8) * ELEMENT_POWER_MULT;
        const chainRange = GRID; // 1 block away
        const maxChains = 7;
        const hitIds = new Set([enemy.id]);
        let current = enemy;
        for (let i = 0; i < maxChains; i++) {
          let next = null;
          let bestD = chainRange;
          for (const other of state.entities.enemies) {
            if (hitIds.has(other.id)) continue;
            const d = Math.hypot(other.x - current.x, other.y - current.y);
            if (d <= bestD) {
              bestD = d;
              next = other;
            }
          }
          if (!next) break;
          next.hp -= chainDamage;
          hitIds.add(next.id);
          current = next;
        }
      }
    }

    return { speedMult, incomingMult, accuracyPenalty };
  }

  function applyCard(card) {
    const base = rarityBase(card.rarity.name);
    let corruption = 0;
    const traits = [...card.traits];
    let mutated = false;
    if (player.cardMutator > 0 && Math.random() < Math.min(0.55, player.cardMutator)) {
      const mod = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
      const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      traits.push({ mod, element, negative: false });
      mutated = true;
    }
    for (const trait of traits) {
      let amount = base;
      if (trait.negative) {
        amount *= -0.5;
        corruption += 1;
      }
      trait.mod.apply(player, amount);
      player.elements.add(trait.element);
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
    addDebug(`AUTO CARD ${card.rarity.name} +${traits.length} traits${mutated ? " [MUTATED]" : ""}${corruption ? ` (${corruption} corrupted)` : ""}`);
    logEvent("card_gain", { rarity: card.rarity.name, traits: traits.map((t) => t.mod.id), mutated });
  }

  function renderCardTray() {
    if (state.ui.levelDraft.active) {
      const cards = state.ui.levelDraft.options;
      cardPanel.classList.add("active");
      cardPanel.classList.add("draft");
      cardPanel.innerHTML = cards.map((c, i) => {
        const base = rarityBase(c.rarity.name);
        const lines = c.traits.map((t) => {
          const amount = base * (t.negative ? -0.5 : 1);
          return `<li>${traitValueText(t.mod, amount)} <span style="color:${ELEMENT_COLORS[t.element]}">${t.element}</span>${t.negative ? " <b>-</b>" : ""}</li>`;
        }).join("");
        const selected = i === state.ui.levelDraft.index;
        const border = selected ? "#ffe08a" : c.rarity.color;
        const shadow = selected ? "0 0 0 2px #ffe08a inset, 0 0 18px rgba(255,224,138,0.6)" : "";
        const phaseText = state.ui.levelDraft.rolling ? "Lootbox rolling..." : state.ui.levelDraft.revealing ? "Selected!" : "Auto picked";
        return `<article class="card draft-card${selected ? " selected" : ""}" style="border-color:${border};${shadow ? `box-shadow:${shadow};` : ""}">
          <h3>${selected ? "▶ " : ""}${c.rarity.name}</h3>
          <div class="rarity">${phaseText}</div>
          <ul>${lines}</ul>
        </article>`;
      }).join("");
      return;
    }
    const cards = state.ui.recentCards;
    if (!cards.length) {
      cardPanel.classList.remove("active");
      cardPanel.classList.remove("draft");
      cardPanel.innerHTML = "";
      return;
    }
    cardPanel.classList.add("active");
    cardPanel.classList.remove("draft");
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
    let upgradeChance = clamp(0.003 + power * 0.008 + player.luck * 0.003 + player.rareBias, 0, 0.16);
    while (rarityIndex < RARITIES.length - 1 && Math.random() < upgradeChance) {
      rarityIndex += 1;
      upgradeChance *= 0.5;
    }
    if (player.fateDice > 0 && Math.random() < Math.min(0.35, player.fateDice)) {
      rarityIndex = Math.min(RARITIES.length - 1, rarityIndex + 1);
    }
    const rarity = RARITIES[rarityIndex];
    const traitCount = RARITY_TRAITS[rarity.name];
    const traits = [];
    for (let i = 0; i < traitCount; i++) {
      const mod = pickCardModWeighted();
      const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      const negative = rarity.name !== "Common" && Math.random() < 0.14;
      traits.push({ mod, element, negative });
    }
    return {
      rarity,
      traits
    };
  }

  function openLevelDraft(power = 1) {
    if (state.ui.levelDraft.active) {
      state.ui.levelDraft.queue.push(power);
      return;
    }
    state.ui.levelDraft.active = true;
    state.ui.levelDraft.options = Array.from({ length: 5 }, () => makeCard(power));
    state.ui.levelDraft.rolling = true;
    state.ui.levelDraft.revealing = false;
    state.ui.levelDraft.index = 0;
    state.ui.levelDraft.nextTickAtMs = state.nowMs + 70;
    state.ui.levelDraft.stopAtMs = state.nowMs + 1600;
    state.ui.levelDraft.revealUntilMs = 0;
    renderCardTray();
  }

  function resolveLevelDraft(index) {
    const card = state.ui.levelDraft.options[index];
    if (card) applyCard(card);
    if (state.ui.levelDraft.queue.length) {
      const nextPower = state.ui.levelDraft.queue.shift();
      state.ui.levelDraft.options = Array.from({ length: 5 }, () => makeCard(nextPower));
      state.ui.levelDraft.rolling = true;
      state.ui.levelDraft.revealing = false;
      state.ui.levelDraft.index = 0;
      state.ui.levelDraft.nextTickAtMs = state.nowMs + 70;
      state.ui.levelDraft.stopAtMs = state.nowMs + 1600;
      state.ui.levelDraft.revealUntilMs = 0;
      renderCardTray();
      return;
    }
    state.ui.levelDraft.active = false;
    state.ui.levelDraft.options = [];
    state.ui.levelDraft.rolling = false;
    state.ui.levelDraft.revealing = false;
    renderCardTray();
  }

  function updateLevelDraftRoulette() {
    if (!state.ui.levelDraft.active) return;
    if (state.ui.levelDraft.rolling) {
      if (state.nowMs >= state.ui.levelDraft.nextTickAtMs && state.ui.levelDraft.options.length) {
        state.ui.levelDraft.index = (state.ui.levelDraft.index + 1) % state.ui.levelDraft.options.length;
        state.ui.levelDraft.nextTickAtMs = state.nowMs + 70;
        renderCardTray();
      }
      if (state.nowMs >= state.ui.levelDraft.stopAtMs) {
        state.ui.levelDraft.rolling = false;
        state.ui.levelDraft.revealing = true;
        state.ui.levelDraft.revealUntilMs = state.nowMs + 2000;
        renderCardTray();
      }
      return;
    }
    if (!state.ui.levelDraft.revealing) return;
    if (state.nowMs < state.ui.levelDraft.revealUntilMs) return;
    state.ui.levelDraft.revealing = false;
    resolveLevelDraft(state.ui.levelDraft.index);
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

      // Fallback: fleet keeps contributing even when player isn't currently firing.
      f.cooldown = (f.cooldown || 0) - state.dt;
      if (f.cooldown <= 0 && state.entities.enemies.length) {
        const target = state.entities.enemies[Math.floor(Math.random() * state.entities.enemies.length)];
        shootBullet(f.x, f.y, target.x, target.y, "player", {
          speed: player.bulletSpeed * 0.9,
          range: player.range,
          damage: player.attack * 0.26 * player.fleetDamageMult,
          size: Math.max(1.8, player.bulletSize * 0.7)
        });
        f.cooldown = 1.05;
      }
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
          const meleeTickDmg = player.meleeDamage * (frenzy ? 1.9 : 1.2) * state.dt;
          e.hp -= meleeTickDmg;
          healPlayer(meleeTickDmg * player.lifeSteal);
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

    const nearest = findNearestEnemy(Infinity);
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
    healPlayer(total * player.lifeSteal);
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
      } else if (e.type === "melee") {
        if (dist > e.preferredDistance + 20) {
          e.vx = nx * moveSpeed;
          e.vy = ny * moveSpeed;
        } else {
          e.vx = -ny * moveSpeed * 0.85 * e.orbitDir;
          e.vy = nx * moveSpeed * 0.85 * e.orbitDir;
        }
        e.orbAngle += dt * (Math.PI * 2) * (e.meleeOrbRpm / 60);
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
        if (e.type === "kamikaze") {
          // Kamikaze detonates on impact and is consumed.
          damagePlayer(e.damage * 1.6 + e.contactDps * 0.6);
          applyExplosionAoE(e.x, e.y, Math.max(20, e.damage * 0.9), "rgba(255, 120, 90, 0.9)");
          e.hp = 0;
        } else if (e.type === "melee") {
          // Melee bruisers now also detonate on direct hull impact.
          damagePlayer(e.damage * 1.1 + e.contactDps * 0.45);
          applyExplosionAoE(e.x, e.y, Math.max(16, e.damage * 0.65), "rgba(126, 245, 160, 0.9)");
          e.hp = 0;
        } else {
          damagePlayer(e.contactDps * dt);
          e.hp -= 5 * dt;
        }
      }
      if (e.type === "melee" && e.meleeOrbCount > 0) {
        for (let i = 0; i < e.meleeOrbCount; i++) {
          const a = e.orbAngle + (Math.PI * 2 * i) / e.meleeOrbCount;
          const ox = e.x + Math.cos(a) * e.meleeOrbRadius;
          const oy = e.y + Math.sin(a) * e.meleeOrbRadius;
          const dOrb = Math.hypot(player.x - ox, player.y - oy);
          if (dOrb < player.shipSize + 8) {
            damagePlayer(e.meleeOrbDamage * dt);
          }
        }
      }
      enemyShoot(e, dist);
    }

    for (let i = state.entities.enemies.length - 1; i >= 0; i--) {
      const e = state.entities.enemies[i];
      if (e.hp > 0) continue;
      state.kills += 1;
      state.telemetry.counters.enemyKills += 1;
      addPrestigeScore(18 * e.power, "kill");
      gainXp(100 * XP_GAIN_MULT);
      if (player.killSurge > 0) {
        player.buffs.speedFireUntil = Math.max(player.buffs.speedFireUntil, state.time + 0.7 + player.killSurge * 0.45);
      }
      if (player.deathNovaChance > 0 && Math.random() < Math.min(0.7, player.deathNovaChance)) {
        const saved = player.explosiveRadiusMult;
        player.explosiveRadiusMult *= player.deathNovaRadius;
        applyExplosionAoE(e.x, e.y, Math.max(24, e.maxHp * 0.12), "rgba(255, 95, 132, 0.88)");
        player.explosiveRadiusMult = saved;
      }
      const dropChance = Math.min(1, 0.4 * 3);
      if (Math.random() < dropChance) {
        dropCardShard(e.x, e.y, e.power);
      }
      if (player.markedEnemyId === e.id) player.markedEnemyId = null;
      state.entities.enemies.splice(i, 1);
      spawnEnemy(DEATH_SPAWN_COUNT);
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
    if (state.entities.enemies.length >= ENEMY_CAP) {
      state.nextSpawnAt = state.time + 0.2;
      return;
    }
    if (state.time < state.nextSpawnAt) return;
    const targetBase = 9 + Math.floor(state.time / 30) + Math.floor(player.level * 1.1);
    const target = clamp(targetBase + Math.floor(state.kills / 35), 8, ENEMY_CAP);
    const alive = state.entities.enemies.length;
    const deficit = target - alive;
    if (deficit <= 0) {
      state.nextSpawnAt = state.time + 0.18;
      return;
    }
    const amount = clamp((1 + Math.floor(deficit / 8)) * 2, 1, 8);
    const waveInfo = spawnEnemy(amount);
    state.telemetry.wave += 1;
    logEvent("wave_spawn", {
      wave: state.telemetry.wave,
      amount,
      target,
      alive,
      kamikaze: waveInfo.kamikazeCount,
      assault: waveInfo.assaultCount,
      sniper: waveInfo.sniperCount,
      boss: waveInfo.bossCount
    });
    state.nextSpawnAt = state.time + clamp((0.55 - state.time * 0.0006) * 0.5, 0.11, 0.28);
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
      const enemyColor =
        e.type === "kamikaze"
          ? "#ff875e"
          : e.type === "assault"
            ? "#ff6fda"
            : e.type === "sniper"
              ? "#ffd36b"
              : e.type === "boss"
                ? "#ff3b3b"
                : "#7ef5a0";
      drawShip(e.x, e.y, e.size, enemyColor, ang);
      if (e.type === "melee" && e.meleeOrbCount > 0) {
        for (let i = 0; i < e.meleeOrbCount; i++) {
          const a = e.orbAngle + (Math.PI * 2 * i) / e.meleeOrbCount;
          const ox = e.x + Math.cos(a) * e.meleeOrbRadius;
          const oy = e.y + Math.sin(a) * e.meleeOrbRadius;
          const op = toScreen(ox, oy);
          ctx.beginPath();
          ctx.arc(op.x, op.y, 4.8 * state.camera.zoom, 0, Math.PI * 2);
          ctx.fillStyle = "#9dffbf";
          ctx.fill();
          ctx.strokeStyle = "#52cc82";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
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

      const activeStatuses = STATUS_KEYS
        .filter((k) => status[k].stacks > 0)
        .sort((a, b) => status[b].stacks - status[a].stacks)
        .slice(0, 2);
      if (activeStatuses.length) {
        ctx.font = `${Math.max(9, 10 * state.camera.zoom)}px monospace`;
        for (let si = 0; si < activeStatuses.length; si++) {
          const key = activeStatuses[si];
          const text = `${STATUS_LABELS[key]} x${status[key].stacks}`;
          ctx.fillStyle = ELEMENT_COLORS[key];
          ctx.fillText(text, p.x - w / 2, p.y - 8 - si * 12 * state.camera.zoom);
        }
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
        const megaLabel = state.prestige.spins > 5 || (state.prestige.roulette.batchSize || 1) > 1 ? "MEGA x10" : "Single";
        const rollingText = state.prestige.roulette.active ? `Spinning (${megaLabel})...` : `Preparing ${megaLabel}...`;
        ctx.fillText(`Prestige Lootbox (${state.prestige.spins} spins left) ${rollingText}`, canvas.width / 2 - 290, canvas.height / 2 + 20);
        for (let i = 0; i < state.prestige.offers.length; i++) {
          const offer = state.prestige.offers[i];
          const selected = state.prestige.roulette.active && i === state.prestige.roulette.index;
          ctx.fillStyle = selected ? "#ffe08a" : offer.color;
          ctx.fillText(`${selected ? "▶ " : ""}${offer.label} (${offer.stat})`, canvas.width / 2 - 230, canvas.height / 2 + 50 + i * 24);
        }
        ctx.fillStyle = "#ffffff";
      } else {
        const restartIn = Math.max(0, ((state.autoRestartAtMs - state.nowMs) / 1000));
        ctx.fillText(`Auto restart in ${restartIn.toFixed(1)}s (fresh build each run)`, canvas.width / 2 - 210, canvas.height / 2 + 20);
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
      `drops=instant fleet=${state.entities.fleet.length} kills=${state.kills}`,
        `challenge=x${CHALLENGE_MULTIPLIER} cardDropBase=${CARD_DROP_BASE_CHANCE}`,
        `rng seed=${state.randomizer.seed} hp=${state.randomizer.enemyHp.toFixed(2)} spd=${state.randomizer.enemySpeed.toFixed(2)} bspd=${state.randomizer.enemyBulletSpeed.toFixed(2)}`,
        `logs=${state.telemetry.events.length} wave=${state.telemetry.wave}`,
        `prestige score=${Math.floor(state.prestige.score)} spins=${state.prestige.spins} nodes=${state.prestige.tree.length}`,
        `cd[dash:${player.cooldowns.dash.toFixed(1)} spd:${player.cooldowns.speed.toFixed(1)} fleet:${player.cooldowns.fleet.toFixed(1)}]`,
        `elements=[${Array.from(player.elements).join(", ")}]`
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
      `Lvl ${player.level} | Kills ${state.kills} | Cards ${state.totalCards}`,
      `ATK ${player.attack.toFixed(1)} | SHD ${player.shield.toFixed(0)} | ARM ${player.armor.toFixed(0)} | HP ${player.hp.toFixed(0)}`,
      `Crit ${Math.round(player.critChance * 100)}% x${player.critDamage.toFixed(2)} | Luck ${player.luck.toFixed(2)}`,
      `ShipSpd ${player.shipSpeed.toFixed(0)} | BulletSpd ${player.bulletSpeed.toFixed(0)} | Range ${player.range.toFixed(0)}`,
      `Melee ${player.meleeUnlocked ? "ON" : "OFF"} | Orbs ${getOrbCount()} | Orb RPM ${player.meleeRPM.toFixed(0)}`,
      `FX Nova ${(player.deathNovaChance * 100).toFixed(1)}% | Surge ${player.killSurge.toFixed(2)} | Mutator ${(Math.min(0.55, player.cardMutator) * 100).toFixed(1)}%`,
      `Size ship ${player.shipSize.toFixed(1)} bullet ${player.bulletSize.toFixed(1)} | Cards ${state.totalCards}`,
      `XP ${Math.floor(player.xp)} / ${player.xpToNext} | +${Math.round(100 * XP_GAIN_MULT)} XP per kill`,
      `Prestige Score ${Math.floor(state.prestige.score)} | Spins ${state.prestige.spins} (auto lootbox after death)`,
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
    updateLevelDraftRoulette();
    updatePrestigeRoulette();

    if (!state.paused && !state.ui.levelDraft.active) {
      if (!state.gameOver) {
        state.time += dt;
        updatePlayer(dt);
        updateEnemies(dt);
        updateBullets(dt);
        updateMines(dt);
        updateBlasts(dt);
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
    resetPlayerForNewRun();
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
    state.prestige.roulette.active = false;
    state.prestige.roulette.index = 0;
    state.prestige.roulette.batchSize = 1;
    state.prestige.roulette.nextTickAtMs = 0;
    state.prestige.roulette.stopAtMs = 0;
    state.prestige.roulette.nextAutoSpinAtMs = 0;
    state.totalCards = 0;
    state.ui.recentCards = [];
    state.ui.levelDraft.active = false;
    state.ui.levelDraft.options = [];
    state.ui.levelDraft.rolling = false;
    state.ui.levelDraft.revealing = false;
    state.ui.levelDraft.index = 0;
    state.ui.levelDraft.nextTickAtMs = 0;
    state.ui.levelDraft.stopAtMs = 0;
    state.ui.levelDraft.revealUntilMs = 0;
    state.ui.levelDraft.queue = [];
    state.telemetry.counters.cards = 0;
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
    if (state.ui.levelDraft.active) {
      return;
    }
    keys.add(k);

    if (k === "f3") {
      e.preventDefault();
      state.debug = !state.debug;
    }
    if (k === "0") rollRandomizerProfile();
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
    if (k === "r") player.mode = player.mode === "assault" ? "sniper" : "assault";
    if (k === "enter" && state.gameOver) resetRunKeepCards();
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  resize();
  attachTelemetryApi();
  rollRandomizerProfile();
  logEvent("session_start", { challenge: CHALLENGE_MULTIPLIER });
  spawnEnemy(8);
  requestAnimationFrame(tick);
})();

import * as THREE from 'three';

/**
 * 低模工厂：全部用 three.js 基础几何体拼装，材质共享、flat shading。
 * 无外部模型资源。
 */

const materialCache = new Map<number, THREE.MeshStandardMaterial>();

function mat(color: number): THREE.MeshStandardMaterial {
  let m = materialCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 });
    // 模块级缓存共享：disposeObject 必须跳过它
    m.userData.shared = true;
    materialCache.set(color, m);
  }
  return m;
}

function mesh(
  geo: THREE.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  return m;
}

// ---------- 敌人 ----------

export function makeGoblin(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(0.45, 0.9, 6), 0x58b368, 0, 0.45));
  g.add(mesh(new THREE.IcosahedronGeometry(0.32, 0), 0x6cc47e, 0, 1.0));
  return g;
}

export function makeWolf(): THREE.Group {
  const g = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(0.42, 0), 0x9aa5b1, 0, 0.5);
  body.scale.set(1.5, 0.8, 0.8);
  g.add(body);
  g.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 4), 0x7f8c9b, 0.45, 0.85, 0.15));
  g.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 4), 0x7f8c9b, 0.45, 0.85, -0.15));
  return g;
}

export function makeCaptain(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(0.7, 1.3, 6), 0x3d8b4f, 0, 0.65));
  g.add(mesh(new THREE.IcosahedronGeometry(0.45, 0), 0x4da060, 0, 1.45));
  // 双角
  const hornL = mesh(new THREE.ConeGeometry(0.1, 0.4, 4), 0x2f6e3d, -0.25, 1.8);
  hornL.rotation.z = 0.5;
  const hornR = mesh(new THREE.ConeGeometry(0.1, 0.4, 4), 0x2f6e3d, 0.25, 1.8);
  hornR.rotation.z = -0.5;
  g.add(hornL, hornR);
  return g;
}

// ---------- 防御塔（三级外观明显变化） ----------

const ARCHER_ROOF = [0x3d9970, 0x2ecc71, 0xf1c40f];

export function makeArcherTower(level: number): THREE.Group {
  const lv = level - 1; // 0..2
  const g = new THREE.Group();
  const baseH = 0.9 + lv * 0.3;
  g.add(mesh(new THREE.BoxGeometry(0.9, baseH, 0.9), 0x8b5a2b, 0, baseH / 2));
  g.add(mesh(new THREE.ConeGeometry(0.75, 0.6, 4), ARCHER_ROOF[lv], 0, baseH + 0.3));
  if (lv >= 1) {
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), 0x5d3a1a, 0.3, baseH + 0.6));
    g.add(mesh(new THREE.BoxGeometry(0.25, 0.18, 0.02), 0xe74c3c, 0.42, baseH + 0.75));
  }
  if (lv >= 2) {
    g.add(mesh(new THREE.IcosahedronGeometry(0.15, 0), 0xf1c40f, 0, baseH + 0.7));
  }
  return g;
}

const TENT_COLORS = [0x95a5a6, 0x3498db, 0x9b59b6];

export function makeKnightCamp(level: number): THREE.Group {
  const lv = level - 1;
  const g = new THREE.Group();
  // 围栏
  const fenceH = 0.25;
  g.add(mesh(new THREE.BoxGeometry(1.2, fenceH, 0.08), 0x7f8c8d, 0, fenceH / 2, 0.6));
  g.add(mesh(new THREE.BoxGeometry(1.2, fenceH, 0.08), 0x7f8c8d, 0, fenceH / 2, -0.6));
  // 帐篷
  g.add(mesh(new THREE.ConeGeometry(0.55, 0.9 + lv * 0.2, 4), TENT_COLORS[lv], 0, 0.45 + lv * 0.1));
  if (lv >= 1) {
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), 0x5d3a1a, 0, 1.2));
    g.add(mesh(new THREE.BoxGeometry(0.22, 0.15, 0.02), 0xe74c3c, 0.12, 1.35));
  }
  if (lv >= 2) {
    const trim = mesh(new THREE.TorusGeometry(0.6, 0.05, 6, 4), 0xf1c40f, 0, 0.28);
    trim.rotation.x = Math.PI / 2;
    g.add(trim);
  }
  return g;
}

// ---------- 骑士 / 补给箱 / 箭矢 / 塔位 ----------

export function makeKnight(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 6), 0x3498db, 0, 0.3));
  g.add(mesh(new THREE.IcosahedronGeometry(0.2, 0), 0x5dade2, 0, 0.72));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 6), 0xbdc3c7, 0, 0.86));
  return g;
}

export function makeCrate(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), 0xa0522d, 0, 0.28));
  g.add(mesh(new THREE.BoxGeometry(0.74, 0.12, 0.74), 0xd2691e, 0, 0.58));
  g.add(mesh(new THREE.IcosahedronGeometry(0.12, 0), 0xf1c40f, 0, 0.36, 0.36));
  return g;
}

export function makeArrow(): THREE.Group {
  const g = new THREE.Group();
  const shaft = mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), 0x8b5a2b);
  g.add(shaft);
  const head = mesh(new THREE.ConeGeometry(0.06, 0.15, 4), 0xcccccc, 0.32, 0, 0);
  head.rotation.z = -Math.PI / 2;
  g.add(head);
  return g;
}

/** 塔位标记：地面上的柔和光圈 */
export function makeSpotRing(): THREE.Mesh {
  const geo = new THREE.TorusGeometry(0.8, 0.08, 8, 24);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }),
  );
  m.rotation.x = Math.PI / 2;
  return m;
}

/** 塔位旗帜（Kingdom Rush 式）：旗杆 + 旗面。返回组与旗面（供摆动动画）。 */
export function makeFlag(): { group: THREE.Group; flagMesh: THREE.Mesh } {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 5), 0x8b5a2b, 0, 0.65));
  const flagMesh = mesh(new THREE.BoxGeometry(0.5, 0.3, 0.03), 0xc05c5c, 0.27, 1.12);
  g.add(flagMesh);
  g.add(mesh(new THREE.ConeGeometry(0.12, 0.25, 6), 0xc05c5c, 0.47, 1.12));
  return { group: g, flagMesh };
}

/** 塔位拾取盘：不可见，仅用于 Raycast（圆环中间是空洞，无法稳定命中） */
export function makeSpotPickDisc(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(1.0, 16);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/**
 * 守护哨站（低多边形小屋 + 围墙 + 旗）。
 * tier 1 = 木哨站（1-6 关）；tier 2 = 石堡，加高加角楼。
 * 模型 +Z 面是大门，调用方用 rotation.y 对准来路。
 */
export function makeOutpost(tier: 1 | 2): THREE.Group {
  const g = new THREE.Group();
  const wallColor = tier === 1 ? 0xd9cbb0 : 0xb9b3a6;
  const roof = tier === 1 ? 0xc05c5c : 0x4a6b8a;

  // 台基
  g.add(mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.24, 9), 0xc9c2b2, 0, 0.12));

  // 围墙：正 +Z 面留大门缺口
  const wallH = 0.42 + (tier - 1) * 0.12;
  const wallY = 0.24 + wallH / 2;
  g.add(mesh(new THREE.BoxGeometry(1.9, wallH, 0.14), wallColor, 0, wallY, -0.85));
  g.add(mesh(new THREE.BoxGeometry(0.14, wallH, 1.7), wallColor, -0.88, wallY, 0));
  g.add(mesh(new THREE.BoxGeometry(0.14, wallH, 1.7), wallColor, 0.88, wallY, 0));
  g.add(mesh(new THREE.BoxGeometry(0.55, wallH, 0.14), wallColor, -0.67, wallY, 0.85));
  g.add(mesh(new THREE.BoxGeometry(0.55, wallH, 0.14), wallColor, 0.67, wallY, 0.85));

  // 主楼
  const bodyH = 0.95 + (tier - 1) * 0.35;
  g.add(mesh(new THREE.BoxGeometry(0.95, bodyH, 0.95), wallColor, 0, 0.24 + bodyH / 2, -0.15));
  g.add(mesh(new THREE.ConeGeometry(0.85, 0.55, 4), roof, 0, 0.24 + bodyH + 0.27, -0.15));

  // 旗（不做摆动，避免和塔位旗混淆）
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 5), 0x8b5a2b, 0, 0.24 + bodyH + 0.9, -0.15));
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.26, 0.03), roof, 0.23, 0.24 + bodyH + 1.2, -0.15));

  if (tier === 2) {
    for (const sx of [-1, 1]) {
      g.add(
        mesh(
          new THREE.CylinderGeometry(0.22, 0.26, wallH + 0.4, 6),
          wallColor,
          sx * 0.88,
          0.24 + (wallH + 0.4) / 2,
          -0.85,
        ),
      );
      g.add(mesh(new THREE.ConeGeometry(0.3, 0.34, 6), roof, sx * 0.88, 0.24 + wallH + 0.6, -0.85));
    }
  }
  return g;
}

// ---------- 植被（Bad North 风球状灌木丛） ----------

const BUSH_COLORS = [0xa8c686, 0x8fb36e, 0xc4cf8f, 0x9cba7d];

/**
 * 球状灌木丛：3~5 个二十面体球块簇在一起。
 * seed 决定大小/配色/偏移，保证每次生成一致。
 */
export function makeBush(seed: number): THREE.Group {
  const g = new THREE.Group();
  const rand = mulberry32(seed);
  const blobs = 3 + Math.floor(rand() * 3);
  const color = BUSH_COLORS[Math.floor(rand() * BUSH_COLORS.length)];
  for (let i = 0; i < blobs; i++) {
    const r = 0.35 + rand() * 0.4;
    const b = mesh(new THREE.IcosahedronGeometry(r, 0), color);
    b.position.set((rand() - 0.5) * 0.9, r * 0.7 + rand() * 0.15, (rand() - 0.5) * 0.9);
    g.add(b);
  }
  return g;
}

/** 确定性伪随机（mulberry32） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 血条：背景 + 前景两个 Sprite（面向固定相机） */
export function makeHpBar(width = 1.0): { bg: THREE.Sprite; fg: THREE.Sprite } {
  const bg = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: 0x22313f, depthTest: false }),
  );
  bg.scale.set(width, 0.12, 1);
  const fg = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: 0x2ecc71, depthTest: false }),
  );
  fg.center.set(0, 0.5);
  fg.position.x = -width / 2;
  fg.scale.set(width, 0.12, 1);
  bg.renderOrder = 10;
  fg.renderOrder = 11;
  return { bg, fg };
}

export function setHpBarRatio(fg: THREE.Sprite, ratio: number, width = 1.0): void {
  const r = Math.max(0, Math.min(1, ratio));
  fg.scale.x = width * r;
  (fg.material as THREE.SpriteMaterial).color.setHex(
    r > 0.5 ? 0x2ecc71 : r > 0.25 ? 0xf39c12 : 0xe74c3c,
  );
}

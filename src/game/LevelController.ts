import * as THREE from 'three';
import { sfx } from '../audio/sfx';
import { ArcherTower } from '../combat/ArcherTower';
import { Enemy } from '../combat/Enemy';
import { KnightCamp } from '../combat/KnightCamp';
import { Path } from '../combat/Path';
import { WaveSpawner } from '../combat/WaveSpawner';
import { ECONOMY } from '../data/economy';
import { PATH_POINTS, TOWER_SPOTS } from '../data/level';
import { ARCHER_TOWER, KNIGHT_CAMP, type TowerDefBase } from '../data/towers';
import { ENEMY_DEFS, EXIT_LIVES, WAVES, type EnemyDef } from '../data/waves';
import type { WordPack } from '../data/words';
import { GoldWallet } from '../economy/GoldWallet';
import { SupplyCrate } from '../events/SupplyCrate';
import { pickPracticeWords, pickTypeFor } from '../learning/QuestionSelector';
import { computeStars } from '../learning/StarRating';
import { WordBook } from '../learning/WordBook';
import { generateQuestion } from '../quiz/questionGenerator';
import { QuizOverlay } from '../quiz/QuizOverlay';
import { WordAudio } from '../quiz/WordAudio';
import { SessionStateMachine, type SessionState } from '../session/SessionStateMachine';
import { el, makeButton } from '../ui/dom';
import { Hud } from '../ui/Hud';
import { StarResultView } from '../ui/StarResultView';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { toWorld, islandHeight } from '../world/coords';
import type { IslandScene } from '../world/IslandScene';
import {
  makeArcherTower,
  makeArrow,
  makeCaptain,
  makeCrate,
  makeGoblin,
  makeHpBar,
  makeKnight,
  makeKnightCamp,
  makeSpotPickDisc,
  makeSpotRing,
  makeWolf,
  setHpBarRatio,
} from '../world/models';
import type { RaycastPicker } from '../world/RaycastPicker';
import { Tweens, Ease } from '../world/Tween';

const LEGACY_BOOK_KEY = 'vorush.level1-1.records';

function bookKey(packId: string): string {
  return `vorush.records.${packId}`;
}

function clearKey(packId: string): string {
  return `vorush.clear.${packId}`;
}

type Tower = ArcherTower | KnightCamp;

interface EnemyView {
  group: THREE.Group;
  fg: THREE.Sprite;
  hpWidth: number;
}

interface TowerView {
  group: THREE.Group;
  knight?: { group: THREE.Group; fg: THREE.Sprite };
}

/**
 * LevelController：1-1 草原哨站单局编排（替代 Phaser LevelScene）。
 * 逻辑实体（Enemy/Tower/Spawner）与 3D 视图分离，每帧同步；
 * UI 全部 DOM。答题/教学时 combatPaused=true 并屏蔽 3D 拾取。
 */
export class LevelController {
  private wallet = new GoldWallet();
  private book: WordBook;
  private session: SessionStateMachine;
  private path: Path;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private usedSpots = new Map<Tower, number>();
  private towerIds = new Map<string, Tower>();
  private towerSeq = 0;
  private spawner: WaveSpawner | null = null;
  private lives = EXIT_LIVES;
  private combatPaused = true;
  private crate: SupplyCrate | null = null;
  private crateView: { group: THREE.Group; baseY: number; t: number } | null = null;

  private enemyViews = new Map<Enemy, EnemyView>();
  private towerViews = new Map<Tower, TowerView>();
  private spotRings: THREE.Mesh[] = [];
  private spotDiscs: THREE.Mesh[] = [];

  private hud: Hud;
  private quiz: QuizOverlay;
  private resultView: StarResultView;
  private tutorial: TutorialOverlay;
  private buildBar: HTMLElement | null = null;
  private buildMenu: HTMLElement | null = null;
  private phaseButton: HTMLButtonElement | null = null;
  private buildButton: HTMLButtonElement | null = null;
  private selectedTowerDef: TowerDefBase | null = null;
  private tutorialStep = 0;

  constructor(
    private island: IslandScene,
    private picker: RaycastPicker,
    private uiRoot: HTMLElement,
    private pack: WordPack,
    private hooks: { onReplay: () => void; onExit: () => void },
  ) {
    // 动物包旧键一次性迁移
    if (pack.id === 'animals-1') WordBook.migrate(LEGACY_BOOK_KEY, bookKey(pack.id));
    this.book = WordBook.load(bookKey(pack.id), this.wordIds);
    this.path = new Path(PATH_POINTS.map(([x, y]) => ({ x, z: y })));
    this.hud = new Hud(uiRoot);
    this.quiz = new QuizOverlay(uiRoot);
    this.resultView = new StarResultView(uiRoot);
    this.tutorial = new TutorialOverlay(uiRoot);
    this.session = new SessionStateMachine(ECONOMY.waveCount, {
      onEnter: (s) => this.onEnterState(s),
    });

    this.createSpotRings();
    this.refreshHud('');
    island.onFrame((dt) => this.update(dt));
  }

  private get wordIds(): string[] {
    return this.pack.words.map((w) => w.id);
  }

  private saveBook(): void {
    this.book.save(bookKey(this.pack.id));
  }

  // ---------- 工具 ----------

  private worldOf(x2d: number, y2d: number): THREE.Vector3 {
    const { x, z } = toWorld(x2d, y2d);
    return new THREE.Vector3(x, islandHeight(x, z), z);
  }

  private nearestPathPoint(x2d: number, y2d: number): { x: number; y: number } {
    let best = { x: 0, y: 0 };
    let bestDist = Number.MAX_VALUE;
    for (let i = 0; i <= 400; i++) {
      const p = this.path.pointAt((i / 400) * this.path.length);
      const d = Math.hypot(x2d - p.x, y2d - p.z);
      if (d < bestDist) {
        bestDist = d;
        best = { x: p.x, y: p.z };
      }
    }
    return best;
  }

  private refreshHud(waveLabel?: string): void {
    this.hud.refresh(this.wallet.balance, this.lives, waveLabel ?? this.hudWaveLabel());
  }

  private hudWaveLabel(): string {
    const s = this.session.state;
    if (s.phase === 'COMBAT') return `第 ${s.wave}/3 波 ⚔️`;
    if (s.phase === 'PRACTICE') return '学习时间 📚';
    if (s.phase === 'BUILD') return s.wave === 0 ? '准备' : `第 ${s.wave}/3 波`;
    return '';
  }

  /** 开始单局（词包选择后由 Game 调用） */
  begin(): void {
    window.dispatchEvent(new Event('vorush-session-start'));
    this.session.start();
  }

  /** 销毁：清理 3D 实体、补间与 DOM，供返回词包选择/重玩 */
  dispose(): void {
    this.crate?.destroy();
    this.crate = null;
    for (const enemy of this.enemies) {
      const view = this.enemyViews.get(enemy);
      if (view) this.island.scene.remove(view.group);
    }
    this.enemies = [];
    this.enemyViews.clear();
    for (const view of this.towerViews.values()) {
      this.island.scene.remove(view.group);
      if (view.knight) this.island.scene.remove(view.knight.group);
    }
    this.towerViews.clear();
    this.towers = [];
    for (const ring of this.spotRings) this.island.scene.remove(ring);
    for (const disc of this.spotDiscs) this.island.scene.remove(disc);
    this.spotRings = [];
    this.spotDiscs = [];
    this.picker.clear();
    Tweens.killAll();
    this.quiz.close();
    this.tutorial.clear();
    this.closeBuildMenu();
    this.buildBar?.remove();
    this.hud.root.remove();
  }

  // ---------- 单局状态 ----------

  private onEnterState(state: SessionState): void {
    switch (state.phase) {
      case 'PRE_TEACH':
        this.showPreTeach();
        break;
      case 'BUILD':
        this.enterBuild(state.wave);
        break;
      case 'PRACTICE':
        this.enterPractice();
        break;
      case 'COMBAT':
        this.enterCombat(state.wave);
        break;
      case 'SETTLE':
        this.enterSettle();
        break;
      case 'FAIL':
        this.enterFail();
        break;
    }
  }

  /** 战前认识：依次展示 4 个新词（图 + 发音 + 词形） */
  private showPreTeach(): void {
    let index = 0;
    const dim = el('div', { className: 'modal-dim' });
    this.uiRoot.append(dim);

    const showWord = () => {
      dim.innerHTML = '';
      if (index >= this.pack.words.length) {
        dim.remove();
        this.saveBook();
        this.session.advance();
        return;
      }
      const word = this.pack.words[index];
      this.book.markTaught(word.id);

      const next = makeButton({
        label: index === this.pack.words.length - 1 ? '去布防 ▶' : '下一个 ▶',
        className: 'btn-green',
        onClick: () => {
          index += 1;
          showWord();
        },
      });
      dim.append(
        el('div', { className: 'modal-panel' }, [
          el('div', {
            className: 'quiz-progress',
            text: `新单词 ${index + 1} / ${this.pack.words.length}`,
          }),
          el('div', { className: 'quiz-emoji', text: word.emoji }),
          el('div', { className: 'quiz-hint', text: word.text }),
          el('div', { className: 'quiz-options', style: 'display:flex;gap:16px' }, [
            makeButton({
              label: '🔊',
              className: 'btn-orange',
              onClick: () => WordAudio.play(word),
            }),
            next,
          ]),
        ]),
      );
      WordAudio.play(word);
    };
    showWord();
  }

  // ---------- 布防 ----------

  private createSpotRings(): void {
    TOWER_SPOTS.forEach(([x, y], i) => {
      const ring = makeSpotRing();
      const w = this.worldOf(x, y);
      ring.position.set(w.x, w.y + 0.06, w.z);
      this.island.scene.add(ring);
      this.spotRings.push(ring);
      // 拾取用不可见圆盘（圆环中空，Raycast 无法稳定命中）
      const disc = makeSpotPickDisc();
      disc.position.set(w.x, w.y + 0.06, w.z);
      this.island.scene.add(disc);
      this.spotDiscs.push(disc);
      this.picker.add({ object: disc, id: `spot-${i}` });
    });
  }

  private enterBuild(wave: number): void {
    this.combatPaused = true;
    this.picker.enabled = true;
    this.refreshHud(wave === 0 ? '准备' : `第 ${wave}/3 波`);

    this.phaseButton = makeButton({
      label: wave === 0 ? '去学习赚金币 📚' : `开始第 ${wave} 波 ⚔️`,
      className: 'btn-green',
      onClick: () => this.leaveBuild(),
    });
    this.buildButton = makeButton({
      label: '建造 🔨',
      onClick: () => this.toggleBuildMenu(),
    });
    this.buildBar = el('div', { id: 'build-bar' }, [this.phaseButton, this.buildButton]);
    this.uiRoot.append(this.buildBar);

    // 首次教学：每次只教一个操作
    if (wave === 0 && TutorialOverlay.shouldShow() && this.tutorialStep === 0) {
      this.tutorialStep = 1;
      this.tutorial.pointToElement(this.buildButton, '点这里建造防御塔');
    }
  }

  private leaveBuild(): void {
    if (this.tutorialStep > 0) {
      this.tutorialStep = 0;
      this.tutorial.finish();
    }
    this.closeBuildMenu();
    this.selectedTowerDef = null;
    this.buildBar?.remove();
    this.buildBar = null;
    this.session.advance();
  }

  private toggleBuildMenu(): void {
    if (this.buildMenu) {
      this.closeBuildMenu();
      return;
    }
    this.buildMenu = el('div', { className: 'build-menu' });

    for (const def of [ARCHER_TOWER, KNIGHT_CAMP] as const) {
      const card = el('div', { className: 'tower-card' }, [
        el('span', { className: 'card-emoji', text: def.emoji }),
        el('div', {}, [
          el('div', { className: 'card-name', text: def.name }),
          el('div', { className: 'card-hint', text: def.hint }),
          el('div', {
            className: `card-price ${this.wallet.canAfford(def.price) ? '' : 'cant-afford'}`,
            text: `💰 ${def.price}`,
          }),
        ]),
      ]);
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.selectedTowerDef = def;
        this.closeBuildMenu();
        this.pulseFreeSpots();
        if (this.tutorialStep === 2) {
          this.tutorialStep = 3;
          const idx = this.firstFreeSpotIndex();
          const [sx, sy] = TOWER_SPOTS[idx];
          const w = this.worldOf(sx, sy);
          const screen = this.island.projectToScreen(w);
          this.tutorial.pointTo(screen.x, screen.y, '点光圈放下防御塔');
        }
      });
      this.buildMenu.append(card);
    }
    this.uiRoot.append(this.buildMenu);

    if (this.tutorialStep === 1 && this.buildMenu.firstElementChild) {
      this.tutorialStep = 2;
      this.tutorial.pointToElement(
        this.buildMenu.firstElementChild as HTMLElement,
        '选一座防御塔',
      );
    }
  }

  private closeBuildMenu(): void {
    this.buildMenu?.remove();
    this.buildMenu = null;
  }

  private firstFreeSpotIndex(): number {
    const used = new Set(this.usedSpots.values());
    return TOWER_SPOTS.findIndex((_, i) => !used.has(i));
  }

  private pulseFreeSpots(): void {
    const used = new Set(this.usedSpots.values());
    this.spotRings.forEach((ring, i) => {
      if (used.has(i)) return;
      const base = ring.scale.x;
      Tweens.add({
        duration: 450,
        ease: Ease.inOutSine,
        onUpdate: (t) => {
          const s = base + Math.sin(t * Math.PI * 4) * 0.18;
          ring.scale.set(s, s, s);
        },
        onComplete: () => ring.scale.set(base, base, base),
      });
    });
  }

  onPick(id: string): void {
    if (id === 'crate') {
      this.crate?.trigger();
      return;
    }
    if (id.startsWith('spot-')) {
      this.onSpotTapped(Number(id.slice(5)));
      return;
    }
    const tower = this.towerIds.get(id);
    if (tower) this.showUpgradePanel(tower);
  }

  private onSpotTapped(index: number): void {
    // 已占用：升级
    for (const [tower, spotIdx] of this.usedSpots) {
      if (spotIdx === index) {
        this.showUpgradePanel(tower);
        return;
      }
    }
    // 空闲塔位 + 已选塔型：建造
    if (!this.selectedTowerDef || this.session.state.phase !== 'BUILD') return;
    const def = this.selectedTowerDef;
    if (!this.wallet.spend(def.price)) return; // 金币不足（失败保护：初始资金够一座塔）

    const [x, y] = TOWER_SPOTS[index];
    let tower: Tower;
    let model: THREE.Group;
    if (def.id === 'archer') {
      tower = new ArcherTower(x, y);
      model = makeArcherTower(1);
    } else {
      const rally = this.nearestPathPoint(x, y);
      tower = new KnightCamp(x, y, rally.x, rally.y);
      model = makeKnightCamp(1);
    }

    // 3D 视图（岛屿加高后模型等比放大保持可读性）
    model.scale.setScalar(1.6);
    const w = this.worldOf(x, y);
    model.position.copy(w);
    this.island.scene.add(model);
    const view: TowerView = { group: model };
    if (tower instanceof KnightCamp) {
      const rallyW = this.worldOf(tower.fighter.x, tower.fighter.y);
      const knightGroup = makeKnight();
      knightGroup.scale.setScalar(1.5);
      knightGroup.position.copy(rallyW);
      const { bg, fg } = makeHpBar(0.7);
      bg.position.y = 1.2;
      fg.position.set(-0.35, 1.2, 0);
      knightGroup.add(bg, fg);
      this.island.scene.add(knightGroup);
      view.knight = { group: knightGroup, fg };
    }
    this.towerViews.set(tower, view);

    // 拾取（升级用）
    const pickId = `tower-${this.towerSeq++}`;
    this.towerIds.set(pickId, tower);
    this.picker.add({ object: model, id: pickId });

    // 塔位标记移除
    const ring = this.spotRings[index];
    this.picker.remove(`spot-${index}`);
    this.island.scene.remove(ring);
    this.island.scene.remove(this.spotDiscs[index]);

    this.towers.push(tower);
    this.usedSpots.set(tower, index);
    this.selectedTowerDef = null;
    sfx.build();
    this.refreshHud();

    if (this.tutorialStep === 3 && this.phaseButton) {
      this.tutorialStep = 4;
      this.tutorial.pointToElement(this.phaseButton, '点这里继续');
    }
  }

  private showUpgradePanel(tower: Tower): void {
    if (this.session.state.phase !== 'BUILD') return;
    if (!tower.canUpgrade || tower.upgradeCost === null) return;
    const cost = tower.upgradeCost;

    const panel = el('div', { className: 'modal-panel' }, [
      makeButton({
        label: `升级 💰${cost}`,
        className: 'btn-green',
        onClick: () => {
          if (!this.wallet.spend(cost)) return;
          tower.upgrade();
          // 升级换模（外观明显变化）
          const view = this.towerViews.get(tower);
          if (view) {
            const pos = view.group.position.clone();
            this.island.scene.remove(view.group);
            const upgraded =
              tower instanceof ArcherTower
                ? makeArcherTower(tower.level + 1)
                : makeKnightCamp(tower.level + 1);
            upgraded.scale.setScalar(1.6);
            upgraded.position.copy(pos);
            this.island.scene.add(upgraded);
            view.group = upgraded;
            // 弹跳反馈
            Tweens.add({
              duration: 250,
              ease: Ease.outBack,
              onUpdate: (t) => upgraded.scale.setScalar(1.6 * (1.25 - t * 0.25)),
            });
          }
          sfx.build();
          this.refreshHud();
          dim.remove();
        },
      }),
      makeButton({ label: '取消', onClick: () => dim.remove() }),
    ]);
    const dim = el('div', { className: 'modal-dim' }, [panel]);
    this.uiRoot.append(dim);
  }

  // ---------- 波间固定练习 ----------

  private enterPractice(): void {
    this.combatPaused = true;
    this.picker.enabled = false; // 答题屏蔽 3D 交互
    this.refreshHud('学习时间 📚');

    const wordIds = pickPracticeWords(
      this.book,
      this.wordIds,
      ECONOMY.practiceQuestionsPerRound,
    );
    const questions = wordIds.map((id) =>
      generateQuestion(id, pickTypeFor(this.book, id), this.pack.words),
    );

    this.quiz.runQuiz(questions, {
      onOutcome: (q, outcome) => {
        this.book.recordAnswer(q.wordId, q.type, outcome);
        this.wallet.rewardFor(outcome);
        this.saveBook();
        sfx.coin();
        this.refreshHud();
      },
      onDone: () => {
        this.picker.enabled = true;
        this.session.advance();
      },
    });
  }

  // ---------- 战斗 ----------

  private enterCombat(wave: number): void {
    this.refreshHud(`第 ${wave}/3 波 ⚔️`);
    this.spawner = new WaveSpawner(WAVES[wave - 1]);
    this.crate = new SupplyCrate({
      onSpawn: (x2d, y2d) => {
        const group = makeCrate();
        group.scale.setScalar(1.4);
        const w = this.worldOf(x2d, y2d);
        group.position.copy(w);
        this.island.scene.add(group);
        this.picker.add({ object: group, id: 'crate' });
        this.crateView = { group, baseY: w.y, t: 0 };
      },
      onClear: () => {
        if (this.crateView) {
          this.island.scene.remove(this.crateView.group);
          this.crateView = null;
        }
        this.picker.remove('crate');
      },
      onTrigger: () => this.openCrateQuiz(),
    });
    this.combatPaused = false;
    this.picker.enabled = true;
  }

  /** 补给箱答题：点击后完全暂停战斗 */
  private openCrateQuiz(): void {
    this.combatPaused = true;
    this.picker.enabled = false;
    const taught = this.wordIds.filter((id) => this.book.isTaught(id));
    const pool = taught.length > 0 ? taught : this.wordIds;
    const wordId = pool[Math.floor(Math.random() * pool.length)];
    const question = generateQuestion(wordId, pickTypeFor(this.book, wordId), this.pack.words);

    this.quiz.runQuiz([question], {
      onOutcome: (q, outcome) => {
        this.book.recordAnswer(q.wordId, q.type, outcome);
        this.wallet.supplyCrateReward();
        this.saveBook();
        sfx.coin();
        this.refreshHud();
      },
      onDone: () => {
        if (this.session.state.phase === 'COMBAT') {
          this.combatPaused = false;
          this.picker.enabled = true;
        }
      },
    });
  }

  private spawnEnemy(id: EnemyDef['id']): void {
    const start = this.path.pointAt(0);
    const enemy = new Enemy(ENEMY_DEFS[id], start.x, start.z);
    this.enemies.push(enemy);

    const group =
      id === 'wolf' ? makeWolf() : id === 'captain' ? makeCaptain() : makeGoblin();
    group.scale.setScalar(1.5);
    const w = this.worldOf(enemy.x, enemy.z);
    group.position.copy(w);
    const hpWidth = id === 'captain' ? 1.4 : 1.0;
    const { bg, fg } = makeHpBar(hpWidth);
    const barY = id === 'captain' ? 2.2 : 1.6;
    bg.position.y = barY;
    fg.position.set(-hpWidth / 2, barY, 0);
    group.add(bg, fg);
    this.island.scene.add(group);
    this.enemyViews.set(enemy, { group, fg, hpWidth });
  }

  private onEnemyExited(enemy: Enemy): void {
    this.lives = Math.max(0, this.lives - enemy.def.lifeCost);
    this.refreshHud();
    this.removeEnemyView(enemy, false);
    if (this.lives <= 0) this.session.fail();
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.removeEnemyView(enemy, true);
  }

  /** 移除敌人视图；killed=true 播放跳起缩小消失（非血腥） */
  private removeEnemyView(enemy: Enemy, killed: boolean): void {
    enemy.active = false;
    const view = this.enemyViews.get(enemy);
    this.enemyViews.delete(enemy);
    if (!view) return;
    const { group } = view;
    if (killed) {
      const startY = group.position.y;
      Tweens.add({
        duration: 300,
        ease: Ease.inBack,
        onUpdate: (t) => {
          group.position.y = startY + t * 1.2;
          group.scale.setScalar(Math.max(0.01, 1 - t));
        },
        onComplete: () => this.island.scene.remove(group),
      });
    } else {
      this.island.scene.remove(group);
    }
  }

  private fireArrow(tower: ArcherTower, target: Enemy, damage: number): void {
    const from = this.worldOf(tower.x, tower.y);
    from.y += 1.2;
    const to = this.worldOf(target.x, target.z);
    to.y += 0.6;
    const arrow = makeArrow();
    arrow.position.copy(from);
    arrow.lookAt(to);
    this.island.scene.add(arrow);
    Tweens.add({
      duration: 120,
      onUpdate: (t) => arrow.position.lerpVectors(from, to, t),
      onComplete: () => {
        this.island.scene.remove(arrow);
        if (target.active && target.hp > 0) {
          target.takeDamage(damage);
          sfx.shoot();
        }
      },
    });
  }

  // ---------- 结算 ----------

  private enterSettle(): void {
    this.combatPaused = true;
    this.picker.enabled = false;
    this.crate?.destroy();
    this.crate = null;
    window.dispatchEvent(new Event('vorush-session-end'));
    const stars = computeStars(true, this.book, this.wordIds);
    this.saveBook();
    // 通关标记：词包选择界面展示星星
    try {
      globalThis.localStorage?.setItem(clearKey(this.pack.id), JSON.stringify(stars));
    } catch {
      // 忽略
    }
    this.resultView.showVictory(
      stars,
      () => this.hooks.onReplay(),
      () => this.hooks.onExit(),
    );
  }

  private enterFail(): void {
    this.combatPaused = true;
    this.picker.enabled = false;
    this.crate?.destroy();
    this.crate = null;
    window.dispatchEvent(new Event('vorush-session-end'));
    this.saveBook(); // 塔防失败不抹除学习记录
    this.resultView.showFail(
      () => this.hooks.onReplay(),
      () => this.hooks.onExit(),
    );
  }

  // ---------- 帧循环 ----------

  private update(dtMs: number): void {
    if (this.combatPaused) return;

    // 出怪
    this.spawner?.update(dtMs, (id) => this.spawnEnemy(id));

    // 敌人推进
    for (const enemy of [...this.enemies]) {
      if (!enemy.active) continue;
      if (enemy.updateEnemy(dtMs, this.path) === 'exited') {
        this.enemies = this.enemies.filter((e) => e !== enemy);
        this.onEnemyExited(enemy);
        if (this.session.state.phase === 'FAIL') return;
      }
    }

    // 塔
    for (const tower of this.towers) {
      if (tower instanceof ArcherTower) {
        const shot = tower.updateTower(dtMs, this.enemies);
        if (shot) this.fireArrow(tower, shot.target, shot.damage);
      } else {
        tower.updateCamp(dtMs, this.enemies);
      }
    }

    // 击杀清理
    for (const enemy of [...this.enemies]) {
      if (enemy.active && enemy.hp <= 0) {
        this.enemies = this.enemies.filter((e) => e !== enemy);
        this.onEnemyKilled(enemy);
      }
    }

    // 补给箱
    this.crate?.update(dtMs);
    if (this.crateView) {
      this.crateView.t += dtMs;
      this.crateView.group.position.y =
        this.crateView.baseY + Math.sin(this.crateView.t / 300) * 0.15;
    }

    // 视图同步
    this.syncViews();

    // 波次结束
    if (
      this.session.state.phase === 'COMBAT' &&
      this.spawner?.finished &&
      this.enemies.length === 0
    ) {
      this.crate?.destroy();
      this.crate = null;
      this.spawner = null;
      this.session.advance();
    }
  }

  private syncViews(): void {
    for (const [enemy, view] of this.enemyViews) {
      if (!enemy.active) continue;
      const w = this.worldOf(enemy.x, enemy.z);
      view.group.position.copy(w);
      setHpBarRatio(view.fg, enemy.hp / enemy.maxHp, view.hpWidth);
    }
    for (const [tower, view] of this.towerViews) {
      if (tower instanceof KnightCamp && view.knight) {
        view.knight.group.visible = tower.fighter.alive;
        if (tower.fighter.alive) {
          setHpBarRatio(
            view.knight.fg,
            tower.fighter.hp / tower.stats.knightHp,
            0.7,
          );
        }
      }
    }
  }
}

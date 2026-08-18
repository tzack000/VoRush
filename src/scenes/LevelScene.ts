import Phaser from 'phaser';
import { unlockAudio, sfx } from '../audio/sfx';
import { ArcherTower } from '../combat/ArcherTower';
import { Enemy } from '../combat/Enemy';
import { KnightCamp } from '../combat/KnightCamp';
import { WaveSpawner } from '../combat/WaveSpawner';
import { ECONOMY } from '../data/economy';
import { PATH_POINTS, TOWER_SPOTS } from '../data/level';
import { ARCHER_TOWER, KNIGHT_CAMP, type TowerDefBase } from '../data/towers';
import { ENEMY_DEFS, EXIT_LIVES, WAVES, type EnemyDef } from '../data/waves';
import { LEVEL_WORDS, LEVEL_WORD_IDS, getWord } from '../data/words';
import { GoldWallet } from '../economy/GoldWallet';
import { SupplyCrate } from '../events/SupplyCrate';
import { pickPracticeWords, pickTypeFor } from '../learning/QuestionSelector';
import { computeStars } from '../learning/StarRating';
import { WordBook } from '../learning/WordBook';
import { generateQuestion } from '../quiz/questionGenerator';
import { QuizOverlay } from '../quiz/QuizOverlay';
import { WordAudio } from '../quiz/WordAudio';
import { SessionStateMachine, type SessionState } from '../session/SessionStateMachine';
import { Button } from '../ui/Button';
import { Hud } from '../ui/Hud';
import { StarResultView } from '../ui/StarResultView';
import { TutorialOverlay } from '../ui/TutorialOverlay';

const BOOK_STORAGE_KEY = 'vorush.level1-1.records';

type Tower = ArcherTower | KnightCamp;

/**
 * LevelScene：1-1 草原哨站唯一游戏场景。
 * 单局流程由 SessionStateMachine 驱动；
 * 答题/教学时 combatPaused=true，战斗逻辑全部停摆（设计 D3）。
 */
export class LevelScene extends Phaser.Scene {
  private wallet!: GoldWallet;
  private book!: WordBook;
  private session!: SessionStateMachine;
  private pathCurve!: Phaser.Curves.Path;
  private pathLength = 0;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private usedSpots = new Map<Tower, number>();
  private spawner: WaveSpawner | null = null;
  private lives = EXIT_LIVES;
  private combatPaused = true;
  private hud!: Hud;
  private quiz!: QuizOverlay;
  private resultView!: StarResultView;
  private tutorial!: TutorialOverlay;
  private crate: SupplyCrate | null = null;

  private buildUI: Phaser.GameObjects.Container | null = null;
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private selectedTowerDef: TowerDefBase | null = null;
  private phaseButton: Button | null = null;
  private buildButton: Button | null = null;
  private spotImages: Phaser.GameObjects.Image[] = [];
  private tutorialStep = 0;

  constructor() {
    super('Level');
  }

  create(): void {
    this.wallet = new GoldWallet();
    this.book = WordBook.load(BOOK_STORAGE_KEY, LEVEL_WORD_IDS);
    WordAudio.init(this);
    this.lives = EXIT_LIVES;
    this.enemies = [];
    this.towers = [];
    this.usedSpots = new Map();
    this.spawner = null;
    this.combatPaused = true;
    this.tutorialStep = 0;

    this.renderMap();
    this.hud = new Hud(this);
    this.quiz = new QuizOverlay(this);
    this.resultView = new StarResultView(this);
    this.tutorial = new TutorialOverlay(this);
    this.refreshHud('');

    this.session = new SessionStateMachine(ECONOMY.waveCount, {
      onEnter: (s) => this.onEnterState(s),
    });

    this.showStartOverlay();
  }

  // ---------- 地图 ----------

  private renderMap(): void {
    for (let y = 0; y < 720; y += 64) {
      for (let x = 0; x < 1280; x += 64) {
        this.add.image(x + 32, y + 32, 'tile-grass');
      }
    }

    // 路径（各段均为水平/垂直，直接平铺 64px 路径块）
    this.pathCurve = new Phaser.Curves.Path(PATH_POINTS[0][0], PATH_POINTS[0][1]);
    for (let i = 1; i < PATH_POINTS.length; i++) {
      this.pathCurve.lineTo(PATH_POINTS[i][0], PATH_POINTS[i][1]);
    }
    this.pathLength = this.pathCurve.getLength();
    for (let d = 32; d < this.pathLength; d += 64) {
      const p = this.pathCurve.getPoint(d / this.pathLength);
      if (p.x >= -32 && p.x <= 1312) this.add.image(p.x, p.y, 'tile-path');
    }

    // 塔位
    this.spotImages = TOWER_SPOTS.map(([x, y], i) => {
      const img = this.add.image(x, y, 'spot').setAlpha(0.7);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this.onSpotTapped(i));
      return img;
    });
  }

  /** 找路径上离 (x, y) 最近的点（骑士拦截位） */
  private nearestPathPoint(x: number, y: number): Phaser.Math.Vector2 {
    let best = new Phaser.Math.Vector2();
    let bestDist = Number.MAX_VALUE;
    for (let i = 0; i <= 400; i++) {
      const p = this.pathCurve.getPoint(i / 400);
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < bestDist) {
        bestDist = d;
        best = new Phaser.Math.Vector2(p.x, p.y);
      }
    }
    return best;
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

  private showStartOverlay(): void {
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x2c3e50, 0.92).setDepth(1500);
    const title = this.add
      .text(640, 240, 'VoRush', { fontSize: '84px', color: '#f1c40f', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(1501);
    const sub = this.add
      .text(640, 330, '1-1 草原哨站 · 动物伙伴', { fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(1501);
    const start = new Button(
      this,
      640,
      460,
      { width: 260, height: 84, label: '开始 ▶', fontSize: 36, bg: 0x27ae60 },
      () => {
        // 首次用户手势内解锁音频（iOS Safari 限制）
        unlockAudio();
        WordAudio.unlock();
        dim.destroy();
        title.destroy();
        sub.destroy();
        start.destroy();
        this.session.start();
      },
    ).setDepth(1501);
  }

  /** 战前认识：依次展示 4 个新词（图 + 发音 + 词形） */
  private showPreTeach(): void {
    const overlay = this.add.container(0, 0).setDepth(1100);
    let index = 0;

    const showWord = () => {
      overlay.removeAll(true);
      if (index >= LEVEL_WORDS.length) {
        overlay.destroy();
        this.book.save(BOOK_STORAGE_KEY);
        this.session.advance();
        return;
      }
      const word = LEVEL_WORDS[index];
      this.book.markTaught(word.id);

      const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55);
      const panel = this.add
        .rectangle(640, 360, 720, 480, 0xfff8e7)
        .setStrokeStyle(6, 0x8b5a2b);
      const counter = this.add
        .text(640, 160, `新单词 ${index + 1} / ${LEVEL_WORDS.length}`, {
          fontSize: '26px',
          color: '#8b5a2b',
        })
        .setOrigin(0.5);
      const emoji = this.add.text(640, 300, word.emoji, { fontSize: '128px' }).setOrigin(0.5);
      const text = this.add
        .text(640, 440, word.text, { fontSize: '56px', color: '#2c3e50', fontStyle: 'bold' })
        .setOrigin(0.5);
      const speaker = new Button(
        this,
        520,
        530,
        { width: 90, height: 64, label: '🔊', fontSize: 32, bg: 0xf39c12 },
        () => WordAudio.play(word),
      );
      const next = new Button(
        this,
        720,
        530,
        { width: 180, height: 64, label: index === LEVEL_WORDS.length - 1 ? '去布防 ▶' : '下一个 ▶', fontSize: 28 },
        () => {
          index += 1;
          showWord();
        },
      );
      overlay.add([dim, panel, counter, emoji, text, speaker, next]);
      WordAudio.play(word);
    };
    showWord();
  }

  // ---------- 布防 ----------

  private enterBuild(wave: number): void {
    this.combatPaused = true;
    this.refreshHud(wave === 0 ? '准备' : `第 ${wave}/3 波`);

    this.buildUI = this.add.container(0, 0).setDepth(600);
    this.phaseButton = new Button(
      this,
      1000,
      664,
      {
        width: 240,
        height: 72,
        label: wave === 0 ? '去学习赚金币 📚' : `开始第 ${wave} 波 ⚔️`,
        fontSize: 26,
        bg: 0x27ae60,
      },
      () => this.leaveBuild(),
    );
    this.buildButton = new Button(
      this,
      1180,
      664,
      { width: 160, height: 72, label: '建造 🔨', fontSize: 26 },
      () => this.toggleBuildMenu(),
    );
    this.buildUI.add([this.phaseButton, this.buildButton]);

    // 首次教学：每次只教一个操作
    if (wave === 0 && TutorialOverlay.shouldShow() && this.tutorialStep === 0) {
      this.tutorialStep = 1;
      this.tutorial.pointTo(1180, 664, '点这里建造防御塔');
    }
  }

  private leaveBuild(): void {
    if (this.tutorialStep > 0) {
      this.tutorialStep = 0;
      this.tutorial.finish();
    }
    this.closeBuildMenu();
    this.selectedTowerDef = null;
    this.buildUI?.destroy();
    this.buildUI = null;
    this.phaseButton = null;
    this.buildButton = null;
    this.session.advance();
  }

  private toggleBuildMenu(): void {
    if (this.buildMenu) {
      this.closeBuildMenu();
      return;
    }
    this.buildMenu = this.add.container(0, 0).setDepth(700);
    const menu = this.buildMenu;
    const panel = this.add
      .rectangle(1100, 360, 320, 420, 0xfff8e7)
      .setStrokeStyle(5, 0x8b5a2b);
    menu.add(panel);

    ([ARCHER_TOWER, KNIGHT_CAMP] as const).forEach((def, i) => {
      const y = 260 + i * 170;
      const card = this.add
        .rectangle(1100, y, 280, 140, 0xffffff)
        .setStrokeStyle(3, 0x4a90d9);
      const emoji = this.add.text(1000, y - 30, def.emoji, { fontSize: '44px' }).setOrigin(0.5);
      const name = this.add.text(1040, y - 42, def.name, {
        fontSize: '26px',
        color: '#2c3e50',
        fontStyle: 'bold',
      });
      const hint = this.add.text(1040, y - 8, def.hint, { fontSize: '22px', color: '#7f8c8d' });
      const price = this.add.text(1040, y + 28, `💰 ${def.price}`, {
        fontSize: '24px',
        color: this.wallet.canAfford(def.price) ? '#27ae60' : '#e74c3c',
        fontStyle: 'bold',
      });
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        this.selectedTowerDef = def;
        this.closeBuildMenu();
        this.pulseFreeSpots();
        if (this.tutorialStep === 2) {
          this.tutorialStep = 3;
          const [sx, sy] = TOWER_SPOTS[this.firstFreeSpotIndex()];
          this.tutorial.pointTo(sx, sy, '点光圈放下防御塔');
        }
      });
      menu.add([card, emoji, name, hint, price]);
    });

    if (this.tutorialStep === 1) {
      this.tutorialStep = 2;
      this.tutorial.pointTo(1100, 260, '选一座防御塔');
    }
  }

  private closeBuildMenu(): void {
    this.buildMenu?.destroy();
    this.buildMenu = null;
  }

  private firstFreeSpotIndex(): number {
    const used = new Set(this.usedSpots.values());
    return TOWER_SPOTS.findIndex((_, i) => !used.has(i));
  }

  private pulseFreeSpots(): void {
    const used = new Set(this.usedSpots.values());
    this.spotImages.forEach((img, i) => {
      if (!used.has(i)) {
        this.tweens.add({
          targets: img,
          scale: { from: 1, to: 1.15 },
          alpha: { from: 0.7, to: 1 },
          duration: 450,
          yoyo: true,
          repeat: 3,
        });
      }
    });
  }

  private onSpotTapped(index: number): void {
    // 已占用：尝试升级
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
    if (def.id === 'archer') {
      tower = new ArcherTower(this, x, y);
    } else {
      const rally = this.nearestPathPoint(x, y);
      tower = new KnightCamp(this, x, y, rally.x, rally.y);
    }
    tower.setDepth(50);
    this.towers.push(tower);
    this.usedSpots.set(tower, index);
    this.selectedTowerDef = null;
    sfx.build();
    this.refreshHud();

    if (this.tutorialStep === 3) {
      this.tutorialStep = 4;
      this.tutorial.pointTo(1000, 664, '点这里继续');
    }
  }

  private showUpgradePanel(tower: Tower): void {
    if (this.session.state.phase !== 'BUILD') return;
    if (!tower.canUpgrade || tower.upgradeCost === null) return;
    const cost = tower.upgradeCost;
    const panel = this.add.container(tower.x, tower.y - 90).setDepth(800);
    const bg = this.add.rectangle(0, 0, 200, 64, 0xfff8e7).setStrokeStyle(3, 0x8b5a2b);
    const btn = new Button(
      this,
      0,
      0,
      {
        width: 180,
        height: 52,
        label: `升级 💰${cost}`,
        fontSize: 22,
        bg: this.wallet.canAfford(cost) ? 0x27ae60 : 0x95a5a6,
      },
      () => {
        if (!this.wallet.spend(cost)) return;
        tower.upgrade();
        sfx.build();
        this.refreshHud();
        panel.destroy();
      },
    );
    panel.add([bg, btn]);
    this.time.delayedCall(4000, () => panel.destroy());
  }

  // ---------- 波间固定练习 ----------

  private enterPractice(): void {
    this.combatPaused = true;
    this.refreshHud('学习时间 📚');

    const wordIds = pickPracticeWords(
      this.book,
      LEVEL_WORD_IDS,
      ECONOMY.practiceQuestionsPerRound,
    );
    const questions = wordIds.map((id) => generateQuestion(id, pickTypeFor(this.book, id)));

    this.quiz.runQuiz(questions, {
      onOutcome: (q, outcome) => {
        this.book.recordAnswer(q.wordId, q.type, outcome);
        this.wallet.rewardFor(outcome);
        this.book.save(BOOK_STORAGE_KEY);
        sfx.coin();
        this.refreshHud();
      },
      onDone: () => this.session.advance(),
    });
  }

  // ---------- 战斗 ----------

  private enterCombat(wave: number): void {
    this.refreshHud(`第 ${wave}/3 波 ⚔️`);
    this.spawner = new WaveSpawner(WAVES[wave - 1]);
    this.crate = new SupplyCrate(this, {
      onTrigger: () => this.openCrateQuiz(),
    });
    this.combatPaused = false;
  }

  /** 补给箱答题：点击后完全暂停战斗 */
  private openCrateQuiz(): void {
    this.combatPaused = true;
    const taught = LEVEL_WORD_IDS.filter((id) => this.book.isTaught(id));
    const wordId = Phaser.Utils.Array.GetRandom(taught.length > 0 ? taught : LEVEL_WORD_IDS);
    const question = generateQuestion(wordId, pickTypeFor(this.book, wordId));

    this.quiz.runQuiz([question], {
      onOutcome: (q, outcome) => {
        this.book.recordAnswer(q.wordId, q.type, outcome);
        this.wallet.supplyCrateReward();
        this.book.save(BOOK_STORAGE_KEY);
        sfx.coin();
        this.refreshHud();
      },
      onDone: () => {
        if (this.session.state.phase === 'COMBAT') this.combatPaused = false;
      },
    });
  }

  private spawnEnemy(id: EnemyDef['id']): void {
    const start = this.pathCurve.getPoint(0);
    const enemy = new Enemy(this, ENEMY_DEFS[id], start.x, start.y);
    enemy.setDepth(100);
    this.enemies.push(enemy);
  }

  private onEnemyExited(enemy: Enemy): void {
    this.lives = Math.max(0, this.lives - enemy.def.lifeCost);
    this.refreshHud();
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      duration: 200,
      onComplete: () => enemy.destroy(),
    });
    if (this.lives <= 0) this.session.fail();
  }

  private onEnemyKilled(enemy: Enemy): void {
    // 明亮卡通：怪物被打败后跳走/消失，不表现血腥
    this.tweens.add({
      targets: enemy,
      y: enemy.y - 40,
      scale: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => enemy.destroy(),
    });
  }

  private fireArrow(tower: ArcherTower, target: Enemy, damage: number): void {
    const arrow = this.add.image(tower.x, tower.y, 'arrow').setDepth(150);
    const angle = Phaser.Math.Angle.Between(tower.x, tower.y, target.x, target.y);
    arrow.setRotation(angle);
    this.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y,
      duration: 120,
      onComplete: () => {
        arrow.destroy();
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
    this.crate?.destroy();
    this.crate = null;
    const stars = computeStars(true, this.book, LEVEL_WORD_IDS);
    this.book.save(BOOK_STORAGE_KEY);
    this.resultView.showVictory(stars, () => this.scene.restart());
  }

  private enterFail(): void {
    this.combatPaused = true;
    this.crate?.destroy();
    this.crate = null;
    this.book.save(BOOK_STORAGE_KEY); // 塔防失败不抹除学习记录
    this.resultView.showFail(() => this.scene.restart());
  }

  // ---------- 帧循环 ----------

  update(_time: number, delta: number): void {
    if (this.combatPaused) return;
    const dt = delta;

    // 出怪
    this.spawner?.update(dt, (id) => this.spawnEnemy(id));

    // 敌人推进
    for (const enemy of [...this.enemies]) {
      if (!enemy.active) continue;
      if (enemy.updateEnemy(dt, this.pathCurve, this.pathLength) === 'exited') {
        this.enemies = this.enemies.filter((e) => e !== enemy);
        this.onEnemyExited(enemy);
        if (this.session.state.phase === 'FAIL') return;
      }
    }

    // 塔
    for (const tower of this.towers) {
      if (tower instanceof ArcherTower) {
        const shot = tower.updateTower(dt, this.enemies);
        if (shot) this.fireArrow(tower, shot.target, shot.damage);
      } else {
        tower.updateCamp(dt, this.enemies);
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
    this.crate?.update(dt);

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

  private refreshHud(waveLabel?: string): void {
    this.hud.refresh(
      this.wallet.balance,
      this.lives,
      waveLabel ?? this.hudWaveLabel(),
    );
  }

  private hudWaveLabel(): string {
    const s = this.session?.state;
    if (!s) return '';
    if (s.phase === 'COMBAT') return `第 ${s.wave}/3 波 ⚔️`;
    if (s.phase === 'PRACTICE') return '学习时间 📚';
    if (s.phase === 'BUILD') return s.wave === 0 ? '准备' : `第 ${s.wave}/3 波`;
    return '';
  }
}

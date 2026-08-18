import Phaser from 'phaser';
import { getWord } from '../data/words';
import { sfx } from '../audio/sfx';
import type { AnswerOutcome } from '../learning/WordBook';
import { Button } from '../ui/Button';
import type { QuizQuestion } from './questionGenerator';
import { WordAudio } from './WordAudio';

export interface QuizHooks {
  /** 每题完成后回调（此时可发金币、写学习记录） */
  onOutcome: (question: QuizQuestion, outcome: AnswerOutcome) => void;
  /** 全部题目完成 */
  onDone: () => void;
}

/**
 * 通用答题层：题面区 + 4 个 ≥60pt 选项 + 语音重播按钮。
 * 打开时由场景负责暂停战斗。无倒计时、无红叉。
 */
export class QuizOverlay {
  private container: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Container | null = null;

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(1000).setVisible(false);
  }

  get isOpen(): boolean {
    return this.container.visible;
  }

  runQuiz(questions: QuizQuestion[], hooks: QuizHooks): void {
    this.container.setVisible(true);
    this.showQuestion(questions, 0, hooks);
  }

  close(): void {
    this.container.removeAll(true);
    this.panel = null;
    this.container.setVisible(false);
  }

  private showQuestion(
    questions: QuizQuestion[],
    index: number,
    hooks: QuizHooks,
  ): void {
    this.container.removeAll(true);

    // 半透明遮罩 + 中央面板
    const dim = this.scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55);
    const panelBg = this.scene.add
      .rectangle(640, 360, 980, 560, 0xfff8e7)
      .setStrokeStyle(6, 0x8b5a2b);
    this.panel = this.scene.add.container(0, 0, [dim, panelBg]);
    const panel = this.panel;
    this.container.add(panel);

    if (index >= questions.length) {
      this.close();
      hooks.onDone();
      return;
    }

    const q = questions[index];
    const progress = this.scene.add
      .text(640, 110, `第 ${index + 1} / ${questions.length} 题`, {
        fontSize: '24px',
        color: '#8b5a2b',
      })
      .setOrigin(0.5);
    panel.add(progress);

    // 题面
    if (q.type === 'listen-pick-image') {
      const hint = this.scene.add
        .text(640, 170, '听一听，点一点正确的图片', { fontSize: '30px', color: '#333333' })
        .setOrigin(0.5);
      const speaker = new Button(
        this.scene,
        640,
        260,
        { width: 120, height: 90, label: '🔊', fontSize: 48, bg: 0xf39c12 },
        () => WordAudio.play(getWord(q.wordId)),
      );
      panel.add([hint, speaker]);
      WordAudio.play(getWord(q.wordId)); // 自动播放一遍
    } else {
      const hint = this.scene.add
        .text(640, 170, '看图，点一点正确的单词', { fontSize: '30px', color: '#333333' })
        .setOrigin(0.5);
      const emoji = this.scene.add
        .text(640, 260, q.promptEmoji, { fontSize: '96px' })
        .setOrigin(0.5);
      panel.add([hint, emoji]);
    }

    // 选项区：2×2 网格，按钮 300×110（远大于 60pt）
    const feedback = this.scene.add
      .text(640, 620, '', { fontSize: '30px', color: '#27ae60', fontStyle: 'bold' })
      .setOrigin(0.5);
    panel.add(feedback);

    let tries = 0;
    let guided = false;
    const positions: Array<[number, number]> = [
      [420, 430],
      [860, 430],
      [420, 560],
      [860, 560],
    ];
    // 选项容器挂在 panel，坐标直接以场景坐标（panel 位于 0,0）
    const correctButtons: Button[] = [];
    q.options.forEach((opt, i) => {
      const [x, y] = positions[i];
      const isEmoji = q.type === 'listen-pick-image';
      const btn = new Button(
        this.scene,
        x,
        y,
        {
          width: 300,
          height: 110,
          label: opt.label,
          fontSize: isEmoji ? 56 : 40,
          bg: 0xffffff,
          textColor: '#2c3e50',
        },
        () => {
          if (opt.isCorrect) {
            const outcome: AnswerOutcome = guided
              ? 'guided'
              : tries === 0
                ? 'first-try'
                : 'second-try';
            sfx.correct();
            feedback.setText('答对啦！🎉');
            btn.setEnabled(false);
            hooks.onOutcome(q, outcome);
            this.scene.time.delayedCall(700, () =>
              this.showQuestion(questions, index + 1, hooks),
            );
          } else {
            tries += 1;
            sfx.wrong();
            btn.setEnabled(false); // 答错的选项变暗，不显示红叉
            this.scene.tweens.add({
              targets: btn,
              x: { from: x - 8, to: x },
              duration: 60,
              yoyo: true,
              repeat: 2,
            });
            if (tries >= 2 && !guided) {
              // 第二次也答错：引导完成——高亮正确项，保持温和提示
              guided = true;
              feedback.setColor('#e67e22');
              feedback.setText('没关系，点一点发光的答案 ✨');
              for (const child of correctButtons) {
                this.scene.tweens.add({
                  targets: child,
                  scale: { from: 1, to: 1.08 },
                  duration: 350,
                  yoyo: true,
                  repeat: -1,
                });
              }
            }
          }
        },
      );
      if (opt.isCorrect) correctButtons.push(btn);
      panel.add(btn);
    });
  }
}

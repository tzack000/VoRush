import { getWord } from '../data/words';
import { sfx } from '../audio/sfx';
import type { AnswerOutcome } from '../learning/WordBook';
import type { QuizQuestion } from './questionGenerator';
import { WordAudio } from './WordAudio';
import { el, makeButton } from '../ui/dom';

export interface QuizHooks {
  /** 每题完成后回调（此时可发金币、写学习记录） */
  onOutcome: (question: QuizQuestion, outcome: AnswerOutcome) => void;
  /** 全部题目完成 */
  onDone: () => void;
}

/**
 * 通用答题层（DOM）：题面区 + 4 个 ≥60pt 选项 + 语音重播按钮。
 * 打开时由控制器负责暂停战斗并屏蔽 3D 交互。无倒计时、无红叉。
 */
export class QuizOverlay {
  private dim: HTMLElement | null = null;

  constructor(private uiRoot: HTMLElement) {}

  get isOpen(): boolean {
    return this.dim !== null;
  }

  runQuiz(questions: QuizQuestion[], hooks: QuizHooks): void {
    this.showQuestion(questions, 0, hooks);
  }

  close(): void {
    this.dim?.remove();
    this.dim = null;
  }

  private showQuestion(
    questions: QuizQuestion[],
    index: number,
    hooks: QuizHooks,
  ): void {
    if (index >= questions.length) {
      this.close();
      hooks.onDone();
      return;
    }

    this.close();
    const q = questions[index];
    const dim = el('div', { className: 'modal-dim' });
    const panel = el('div', { className: 'modal-panel quiz-panel' });
    dim.append(panel);
    this.dim = dim;
    this.uiRoot.append(dim);

    panel.append(el('div', {
      className: 'quiz-progress',
      text: `第 ${index + 1} / ${questions.length} 题`,
    }));

    // 题面
    if (q.type === 'listen-pick-image') {
      panel.append(el('div', { className: 'quiz-hint', text: '听一听，点一点正确的图片' }));
      const speaker = makeButton({
        label: '🔊',
        className: 'btn-orange',
        onClick: () => WordAudio.play(getWord(q.wordId)),
      });
      panel.append(speaker);
      WordAudio.play(getWord(q.wordId)); // 自动播放一遍
    } else {
      panel.append(el('div', { className: 'quiz-hint', text: '看图，点一点正确的单词' }));
      panel.append(el('div', { className: 'quiz-emoji', text: q.promptEmoji }));
    }

    const feedback = el('div', { className: 'quiz-feedback', text: '' });
    const grid = el('div', { className: 'quiz-options' });
    panel.append(grid, feedback);

    let tries = 0;
    let guided = false;
    const correctButtons: HTMLButtonElement[] = [];

    for (const opt of q.options) {
      const isEmoji = q.type === 'listen-pick-image';
      const btn = el('button', {
        className: `quiz-option ${isEmoji ? '' : 'word-option'}`,
        text: opt.label,
        type: 'button',
      });
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (btn.disabled) return;

        if (opt.isCorrect) {
          const outcome: AnswerOutcome = guided
            ? 'guided'
            : tries === 0
              ? 'first-try'
              : 'second-try';
          sfx.correct();
          feedback.classList.remove('guided');
          feedback.textContent = '答对啦！🎉';
          for (const b of Array.from(grid.querySelectorAll('button'))) b.disabled = true;
          hooks.onOutcome(q, outcome);
          setTimeout(() => this.showQuestion(questions, index + 1, hooks), 700);
        } else {
          tries += 1;
          sfx.wrong();
          btn.disabled = true; // 答错选项变暗，不显示红叉
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 300);
          if (tries >= 2 && !guided) {
            // 第二次也答错：引导完成——高亮正确项，保持温和提示
            guided = true;
            feedback.classList.add('guided');
            feedback.textContent = '没关系，点一点发光的答案 ✨';
            for (const b of correctButtons) b.classList.add('guided-glow');
          }
        }
      });
      if (opt.isCorrect) correctButtons.push(btn);
      grid.append(btn);
    }
  }
}

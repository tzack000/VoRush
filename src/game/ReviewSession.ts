import { markReviewComplete } from '../data/progress';
import { generateQuestion } from '../quiz/questionGenerator';
import { QuizOverlay } from '../quiz/QuizOverlay';
import { pickTypeFor } from '../learning/QuestionSelector';
import {
  loadReviewPacks,
  pickReviewWords,
  REVIEW_QUESTION_COUNT,
} from '../learning/ReviewSelector';
import { bookKey } from '../learning/WordBook';
import type { WordDef } from '../data/words';
import { el, makeButton } from '../ui/dom';

/**
 * 无战斗复习短会话：复用 QuizOverlay，不建地形、不发金币。
 */
export class ReviewSession {
  private quiz: QuizOverlay;
  private panel: HTMLElement | null = null;

  constructor(
    private uiRoot: HTMLElement,
    private hooks: { onDone: () => void },
  ) {
    this.quiz = new QuizOverlay(uiRoot);
  }

  begin(now: number = Date.now()): boolean {
    const packs = loadReviewPacks();
    const picked = pickReviewWords(packs, REVIEW_QUESTION_COUNT, now);
    if (picked.length === 0) return false;

    const questions = picked.map((item) => {
      const pack = packs.find((p) => p.packId === item.packId);
      if (!pack) throw new Error(`review pack missing: ${item.packId}`);
      return generateQuestion(item.wordId, pickTypeFor(pack.book, item.wordId), pack.words);
    });

    const seen = new Map<string, WordDef>();
    for (const q of questions) seen.set(q.wordId, q.word);

    this.quiz.runQuiz(questions, {
      heading: '复习巡逻 📚',
      onOutcome: (q, outcome) => {
        const pack = packs.find((p) => p.words.some((w) => w.id === q.wordId));
        if (!pack) return;
        pack.book.recordAnswer(q.wordId, q.type, outcome, Date.now());
        pack.book.save(bookKey(pack.packId));
      },
      onDone: () => {
        markReviewComplete(Date.now());
        this.showComplete([...seen.values()]);
      },
    });
    return true;
  }

  dispose(): void {
    this.quiz.close();
    this.panel?.remove();
    this.panel = null;
  }

  private showComplete(words: WordDef[]): void {
    this.dispose();
    const emojis = words.map((w) => w.emoji).join(' ');
    const panel = el('div', { className: 'modal-dim' }, [
      el('div', { className: 'modal-panel' }, [
        el('div', { className: 'modal-title', text: '复习完成！🎉' }),
        el('div', { className: 'review-done-hint', text: '这些词又记牢了一点' }),
        el('div', { className: 'review-done-words', text: emojis }),
        el('div', { className: 'result-buttons' }, [
          makeButton({
            label: '返回地图',
            className: 'btn-green',
            onClick: () => {
              this.dispose();
              this.hooks.onDone();
            },
          }),
        ]),
      ]),
    ]);
    this.panel = panel;
    this.uiRoot.append(panel);
  }
}

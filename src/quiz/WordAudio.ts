import type { WordDef } from '../data/words';
import { WORD_PACKS } from '../data/words';

/**
 * 单词发音播放：预录 m4a 经 HTMLAudioElement 播放。
 * iOS 要求在用户手势中先解锁（unlock 内对每个元素 play+pause）。
 */
export class WordAudio {
  private static players = new Map<string, HTMLAudioElement>();

  /** 预加载全部词库音频（Game 启动时调用一次） */
  static init(): void {
    if (this.players.size > 0) return;
    const ids = new Set<string>();
    for (const pack of WORD_PACKS) {
      for (const w of pack.words) ids.add(w.id);
    }
    for (const id of ids) {
      const audio = new Audio(`assets/audio/words/${id}.m4a`);
      audio.preload = 'auto';
      this.players.set(id, audio);
    }
  }

  /** 在首次用户手势中调用，解锁 iOS 音频播放 */
  static unlock(): void {
    for (const audio of this.players.values()) {
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    }
  }

  static play(word: WordDef): void {
    const audio = this.players.get(word.id);
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // 未解锁或不支持时静默降级
    });
  }
}

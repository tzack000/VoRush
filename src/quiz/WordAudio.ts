import type { WordDef } from '../data/words';

/**
 * 单词发音播放。
 * 正式实现：预录 m4a 经 Phaser WebAudio 播放（iPad 上可靠，
 * 音效同通道，首次点击"开始"时由 unlockAudio 完成手势解锁）。
 * speechSynthesis 仅作为音频缺失时的兜底（桌面调试用）。
 */
export class WordAudio {
  private static scene: Phaser.Scene | null = null;

  /** LevelScene create 时注入 */
  static init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /** 在首次用户手势中调用（WebAudio 解锁由 sfx.unlockAudio 负责，此处无需操作） */
  static unlock(): void {
    // Phaser 会在首次触摸时自动解锁其 WebAudio 上下文
  }

  static play(word: WordDef): void {
    const scene = this.scene;
    if (scene && scene.cache.audio.exists(word.audioKey)) {
      scene.sound.play(word.audioKey);
      return;
    }
    // 兜底：音频缺失时用系统语音（iOS 上不可靠，仅桌面调试场景）
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(word.text);
      u.lang = 'en-US';
      u.rate = 0.75;
      setTimeout(() => synth.speak(u), 60);
    } catch {
      // 静默降级
    }
  }
}

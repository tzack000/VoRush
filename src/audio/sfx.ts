/**
 * 占位音效：WebAudio 振荡器合成，音量温和、无刺耳失败音。
 * 必须在首次用户手势中调用 unlockAudio()（iOS Safari 限制）。
 */
let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // 任何后续用户手势都尝试恢复（iOS resume 是异步的，可能被首次打断）
      document.addEventListener(
        'pointerdown',
        () => {
          if (ctx && ctx.state === 'suspended') void ctx.resume();
        },
        { capture: true },
      );
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, durationMs: number, delayMs = 0, volume = 0.12): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    // 音效多发生在按钮点击（手势）内，这里再尝试恢复一次
    void ctx.resume();
    return; // 本次丢弃，下一次即可发声
  }
  try {
    const t0 = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durationMs / 1000 + 0.05);
  } catch {
    // 忽略音频失败，不影响游戏
  }
}

export const sfx = {
  /** 答对：明快上行双音 */
  correct(): void {
    tone(523, 120);
    tone(784, 160, 100);
  },
  /** 答错：轻柔低音，不刺耳 */
  wrong(): void {
    tone(220, 200, 0, 0.08);
  },
  /** 补给箱出现提示音 */
  crate(): void {
    tone(660, 100);
    tone(660, 100, 150);
  },
  /** 建造/升级 */
  build(): void {
    tone(330, 90);
    tone(440, 120, 80);
  },
  /** 塔攻击 */
  shoot(): void {
    tone(880, 40, 0, 0.05);
  },
  /** 获得金币 */
  coin(): void {
    tone(988, 90);
    tone(1319, 120, 80);
  },
};

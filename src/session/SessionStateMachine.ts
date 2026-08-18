/**
 * 单局状态机：
 * PRE_TEACH → BUILD(0) → [PRACTICE(i) → BUILD(i) → COMBAT(i)]×3 → SETTLE
 * 任意 COMBAT 中出口生命归零 → FAIL。
 */
export type SessionPhase = 'PRE_TEACH' | 'BUILD' | 'PRACTICE' | 'COMBAT' | 'SETTLE' | 'FAIL';

export interface SessionState {
  phase: SessionPhase;
  /** 当前/即将进行的波次（1~3）；PRE_TEACH 与 BUILD(0) 时为 0 */
  wave: number;
}

export interface SessionHooks {
  onEnter: (state: SessionState) => void;
}

export class SessionStateMachine {
  state: SessionState = { phase: 'PRE_TEACH', wave: 0 };

  constructor(
    private readonly waveCount: number,
    private hooks: SessionHooks,
  ) {}

  start(): void {
    this.hooks.onEnter(this.state);
  }

  /** 当前环节正常完成，推进到下一状态 */
  advance(): void {
    const { phase, wave } = this.state;
    switch (phase) {
      case 'PRE_TEACH':
        this.state = { phase: 'BUILD', wave: 0 };
        break;
      case 'BUILD':
        if (wave === 0) {
          this.state = { phase: 'PRACTICE', wave: 1 };
        } else {
          this.state = { phase: 'COMBAT', wave };
        }
        break;
      case 'PRACTICE':
        this.state = { phase: 'BUILD', wave };
        break;
      case 'COMBAT':
        if (wave >= this.waveCount) {
          this.state = { phase: 'SETTLE', wave };
        } else {
          this.state = { phase: 'PRACTICE', wave: wave + 1 };
        }
        break;
      case 'SETTLE':
      case 'FAIL':
        return; // 终态
    }
    this.hooks.onEnter(this.state);
  }

  /** 出口生命归零：立即进入失败 */
  fail(): void {
    if (this.state.phase === 'FAIL' || this.state.phase === 'SETTLE') return;
    this.state = { phase: 'FAIL', wave: this.state.wave };
    this.hooks.onEnter(this.state);
  }
}

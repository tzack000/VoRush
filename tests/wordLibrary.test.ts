import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WORD_PACKS, getPack, getWordIn } from '../src/data/words';

const AUDIO_DIR = join(__dirname, '..', 'public', 'assets', 'audio', 'words');

describe('词库完整性', () => {
  it('每个词包包含 4~12 个单词', () => {
    for (const pack of WORD_PACKS) {
      expect(pack.words.length, pack.id).toBeGreaterThanOrEqual(4);
      expect(pack.words.length, pack.id).toBeLessThanOrEqual(12);
    }
  });

  it('每个单词有非空词形、emoji 与音频文件', () => {
    for (const pack of WORD_PACKS) {
      for (const word of pack.words) {
        expect(word.text.trim().length, word.id).toBeGreaterThan(0);
        expect(word.emoji.trim().length, word.id).toBeGreaterThan(0);
        expect(
          existsSync(join(AUDIO_DIR, `${word.id}.m4a`)),
          `missing audio: ${word.id}`,
        ).toBe(true);
      }
    }
  });

  it('学校默书包与词表一致（核心词提取）', () => {
    expect(getPack('t1d1').words.map((x) => x.id)).toEqual([
      'monitor',
      'classmate',
      'teacher',
      'goodbye',
      'table',
      'tiger',
      'tree',
      'toe',
      'toy',
    ]);
    expect(getPack('t2d3').words.map((x) => x.id)).toContain('peaches');
    expect(getPack('t2d3').words.map((x) => x.id)).not.toContain('eleven peaches');
  });

  it('T3D2 宠物词表与 PDF 一致（核心词提取）', () => {
    expect(getPack('t3d2').words.map((x) => x.id)).toEqual([
      'goldfish',
      'hamster',
      'parrot',
      'rabbit',
      'run',
      'talk',
      'date',
      'dish',
      'doctor',
      'door',
      'dress',
    ]);
  });

  it('getPack / getWordIn 对未知 id 抛错', () => {
    expect(() => getPack('nope')).toThrow();
    expect(() => getWordIn(getPack('animals-1'), 'nope')).toThrow();
  });
});

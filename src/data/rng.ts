/** 确定性伪随机（mulberry32）：同 seed 同序列。
 *  放在 data/ 层供岛屿轮廓、灌木散布等使用——
 *  它是纯函数，不该让数据层为了它去依赖 three.js 的模型工厂。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

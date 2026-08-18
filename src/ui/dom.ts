/** 极简 DOM 构建工具。 */
type Attrs = Record<string, string | number | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'className') node.className = String(value);
    else if (key === 'text') node.textContent = String(value);
    else if (key === 'html') node.innerHTML = String(value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

export interface ButtonOptions {
  label: string;
  className?: string;
  onClick: () => void;
}

/** 通用按钮：CSS 保证 ≥60pt（80px）触控区域。 */
export function makeButton(opts: ButtonOptions): HTMLButtonElement {
  const btn = el('button', {
    className: `btn ${opts.className ?? ''}`.trim(),
    text: opts.label,
    type: 'button',
  });
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    opts.onClick();
  });
  return btn;
}

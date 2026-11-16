import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';

const HELPER_COLOR = 'var(--ds-editor-handle-color, var(--ds-editor-accent, var(--ds-color-focus, currentColor)))';

/** Resolves a CSS colour expression in the context of an element to an `rgb(…)` string. */
export const resolveCssColor = (context: Element, expression: string): string => {
  const probe = document.createElement('span');
  probe.style.color = expression;
  probe.style.display = 'none';
  context.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
};

/**
 * The colour of the editor's helpers inside the canvas (outlines, frustum, gizmo accents): the theme's
 * `--ds-editor-handle-color`, else `--ds-editor-accent`. Follows the theme when classes or styles above the
 * canvas change. Pass `override` to use a fixed colour instead.
 */
export const useHelperColor = (override?: string): string => {
  const canvas = useThree((state) => state.gl.domElement);
  const [color, setColor] = useState(() => resolveCssColor(canvas, override ?? HELPER_COLOR));

  useEffect(() => {
    const read = () => setColor(resolveCssColor(canvas, override ?? HELPER_COLOR));
    read();
    const observer = new MutationObserver(read);
    for (let node: Element | null = canvas.parentElement; node; node = node.parentElement) {
      observer.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'data-ds-theme'] });
    }
    return () => observer.disconnect();
  }, [canvas, override]);

  return color;
};

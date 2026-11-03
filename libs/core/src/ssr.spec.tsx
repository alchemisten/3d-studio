// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Viewer } from './index';

describe('SSR', () => {
  it('renders on the server without touching window', () => {
    const html = renderToString(
      <Viewer source="/model.glb" slots={{ 'overlay.top-left': <span>tools</span> }} />,
    );
    expect(html).toContain('ds-viewer');
    expect(html).toContain('tools');
    expect(html).toContain('Loading');
  });
});

import { z } from 'zod';

export const EDITOR_MODES = ['select', 'add', 'move-anchor', 'pointer', 'pick-part', 'shot'] as const;

/** What the next interaction in the viewport does. */
export type EditorMode = (typeof EDITOR_MODES)[number];

/**
 * Where the user is in the editor. Serializable, so a host can keep it in the URL
 * (`editorNavToSearch` / `editorNavFromSearch`).
 */
export interface EditorNav {
  /** Id of the open sidebar tab; the first tab when unset or unknown. */
  tool?: string;
  /** Id of the highlight whose detail is open. */
  highlight?: string;
  /** Selected part keys of the material tab, encoded with `encodePartKeys`. */
  part?: string;
  /** Defaults to `select`. */
  mode?: EditorMode;
  collapsed?: boolean;
}

const NAV_KEYS = ['tool', 'highlight', 'part', 'mode', 'collapsed'] as const;

const text = z.string().min(1).optional().catch(undefined);

const navSchema = z.object({
  tool: text,
  highlight: text,
  part: text,
  mode: z.enum(EDITOR_MODES).optional().catch(undefined),
  collapsed: z.boolean().optional().catch(undefined),
});

/** A nav without unset, empty and default entries, so equal states serialize equally. */
export const normalizeNav = (nav: EditorNav): EditorNav => ({
  ...(nav.tool ? { tool: nav.tool } : {}),
  ...(nav.highlight ? { highlight: nav.highlight } : {}),
  ...(nav.part ? { part: nav.part } : {}),
  ...(nav.mode && nav.mode !== 'select' ? { mode: nav.mode } : {}),
  ...(nav.collapsed ? { collapsed: true } : {}),
});

/** Reads the nav from query params; unknown or malformed entries are dropped. */
export const editorNavFromSearch = (search: string | URLSearchParams, prefix = ''): EditorNav => {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const read = (key: string) => params.get(prefix + key) ?? undefined;
  return normalizeNav(
    navSchema.parse({
      tool: read('tool'),
      highlight: read('highlight'),
      part: read('part'),
      mode: read('mode'),
      collapsed: read('collapsed') === '1' ? true : undefined,
    }),
  );
};

/** Writes the nav into a copy of `base`, leaving the host's other params untouched. */
export const editorNavToSearch = (
  nav: EditorNav,
  base: string | URLSearchParams = '',
  prefix = '',
): URLSearchParams => {
  const params = new URLSearchParams(base);
  const { collapsed, ...texts } = normalizeNav(nav);
  const values: Record<string, string | undefined> = { ...texts, collapsed: collapsed ? '1' : undefined };
  NAV_KEYS.forEach((key) => {
    const value = values[key];
    if (value === undefined) params.delete(prefix + key);
    else params.set(prefix + key, value);
  });
  return params;
};

/** Encodes part keys for `nav.part`; `undefined` for an empty selection. */
export const encodePartKeys = (keys: readonly string[]): string | undefined =>
  keys.length ? [...new Set(keys)].map((key) => key.replace(/[%,]/g, encodeURIComponent)).join(',') : undefined;

/** The part keys selected in a nav. */
export const partKeysOf = (nav: EditorNav): string[] => (nav.part ? nav.part.split(',').map(decodeURIComponent) : []);

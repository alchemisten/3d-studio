export const TOKEN_PREFIX = '--ds-';

/** Known token names (without prefix). The string escape hatch allows custom tokens. */
export type TokenName =
  | `color-${string}`
  | `space-${string}`
  | `radius-${string}`
  | `font-${string}`
  | `shadow-${string}`
  | `glass-${string}`
  | `duration-${string}`
  | `icon-button-${string}`
  | `panel-${string}`
  | `menu-${string}`
  | `tooltip-${string}`
  | `overlay-${string}`
  | `control-${string}`
  | `switch-${string}`
  | `checkbox-${string}`
  | `slider-${string}`
  | `progress-${string}`
  | `list-${string}`
  | 'gap';

export type TokenOverrides = Partial<Record<TokenName, string>>;

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  mode?: ThemeMode;
  tokens?: TokenOverrides;
}

/** Typed helper for authoring themes. Identity function that gives autocomplete and checks. */
export const createTheme = (theme: Theme): Theme => theme;

/** Merges themes left to right; later tokens win. */
export const mergeThemes = (...themes: Array<Theme | undefined>): Theme =>
  themes.reduce<Theme>(
    (acc, theme) => ({
      mode: theme?.mode ?? acc.mode,
      tokens: { ...acc.tokens, ...theme?.tokens },
    }),
    {},
  );

/** Converts token overrides to inline CSS custom properties. */
export const tokensToStyle = (tokens: TokenOverrides = {}): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tokens)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([name, value]) => [`${TOKEN_PREFIX}${name}`, value]),
  );

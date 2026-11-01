import { createContext, useContext, useMemo, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { mergeThemes, tokensToStyle, type Theme, type ThemeMode } from './tokens';

const ThemeContext = createContext<Theme>({});

/** Element popups (select, popover) portal into, so they inherit the theme tokens. */
const PortalContext = createContext<HTMLElement | null>(null);

export const usePortalContainer = (): HTMLElement | undefined => useContext(PortalContext) ?? undefined;

export const useTheme = (): Theme => useContext(ThemeContext);

export interface ThemeProviderProps extends HTMLAttributes<HTMLDivElement> {
  /** Theme to apply. Nested providers inherit and merge with their parent. */
  theme?: Theme;
  mode?: ThemeMode;
}

/**
 * Scopes design tokens to a subtree. Renders `display: contents` so it does not
 * affect layout; custom properties still inherit.
 */
export const ThemeProvider = ({ theme, mode, className, style, children, ...rest }: ThemeProviderProps) => {
  const parent = useTheme();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const merged = useMemo(() => mergeThemes(parent, theme, mode ? { mode } : undefined), [parent, theme, mode]);
  const cssVars = useMemo(() => tokensToStyle(merged.tokens), [merged.tokens]);

  return (
    <ThemeContext.Provider value={merged}>
      <PortalContext.Provider value={container}>
      <div
        {...rest}
        ref={setContainer}
        className={['ds-theme', className].filter(Boolean).join(' ')}
        data-ds-theme={merged.mode ?? 'light'}
        style={{ display: 'contents', ...(cssVars as CSSProperties), ...style }}
      >
        {children}
      </div>
      </PortalContext.Provider>
    </ThemeContext.Provider>
  );
};

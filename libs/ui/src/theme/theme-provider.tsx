import { createContext, useContext, useMemo, type CSSProperties, type HTMLAttributes } from 'react';
import { mergeThemes, tokensToStyle, type Theme, type ThemeMode } from './tokens';

const ThemeContext = createContext<Theme>({});

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
  const merged = useMemo(() => mergeThemes(parent, theme, mode ? { mode } : undefined), [parent, theme, mode]);
  const cssVars = useMemo(() => tokensToStyle(merged.tokens), [merged.tokens]);

  return (
    <ThemeContext.Provider value={merged}>
      <div
        {...rest}
        className={['ds-theme', className].filter(Boolean).join(' ')}
        data-ds-theme={merged.mode ?? 'light'}
        style={{ display: 'contents', ...(cssVars as CSSProperties), ...style }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

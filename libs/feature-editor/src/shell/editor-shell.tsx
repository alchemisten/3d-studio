import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertCircle, Check, LoaderCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { type Theme, ThemeProvider } from '@schablone/3d-studio-ui';
import { useEditorTranslate } from '../editor-context';
import { type EditorNav, normalizeNav } from '../editor-nav';
import { EditorShellContext, type EditorTabDefinition } from './shell-context';
import { clampSidebarWidth, nextIndex, orderTabs, SIDEBAR_WIDTH } from './shell-model';
import '../editor.css';

export type EditorStatus = 'saving' | 'saved' | 'error';

export interface EditorShellProps {
  /** Accessible name of the editor. */
  label?: string;
  /** Start of the top bar, e.g. where the user is. */
  start?: ReactNode;
  /** Middle of the top bar, e.g. undo and redo. */
  actions?: ReactNode;
  /** End of the top bar: the host's primary action. */
  end?: ReactNode;
  /** State of the host's autosave, shown as a small indicator in the top bar. */
  status?: EditorStatus;
  /** The host's own sidebar tabs; editor features inside the viewer add theirs. */
  tabs?: readonly EditorTabDefinition[];
  /** Tab ids in display order; tabs not named follow by their `order`. */
  tabOrder?: readonly string[];
  /** Controlled navigation state. */
  nav?: EditorNav;
  /** Navigation state on first render when uncontrolled. */
  defaultNav?: EditorNav;
  onNavChange?: (nav: EditorNav) => void;
  theme?: Theme;
  className?: string;
  style?: CSSProperties;
  /** The 3D stage beside the sidebar, usually a `<Viewer>`. */
  children?: ReactNode;
}

const STATUS_ICONS: Record<EditorStatus, ReactNode> = {
  saving: <LoaderCircle size={14} aria-hidden="true" className="ds-editor__status-spinner" />,
  saved: <Check size={14} aria-hidden="true" />,
  error: <AlertCircle size={14} aria-hidden="true" />,
};

const NO_TABS: readonly EditorTabDefinition[] = [];

/**
 * Split-view editor frame: a slim top bar, a collapsible and resizable sidebar whose tabs are the tools, and
 * the 3D stage beside it with nothing laid over it. Below 64rem the sidebar is a sheet under the stage.
 */
export const EditorShell = ({
  label,
  start,
  actions,
  end,
  status,
  tabs: hostTabs = NO_TABS,
  tabOrder,
  nav: controlledNav,
  defaultNav,
  onNavChange,
  theme,
  className,
  style,
  children,
}: EditorShellProps) => {
  const t = useEditorTranslate();
  const [localNav, setLocalNav] = useState<EditorNav>(() => normalizeNav(defaultNav ?? {}));
  const [registered, setRegistered] = useState<readonly EditorTabDefinition[]>(NO_TABS);
  const [width, setWidth] = useState(SIDEBAR_WIDTH.initial);
  const tabList = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const tabId = (id: string) => `${panelId}-tab-${id}`;

  const tabs = useMemo(() => orderTabs([...hostTabs, ...registered], tabOrder), [hostTabs, registered, tabOrder]);
  const storedNav = controlledNav ?? localNav;
  const active = tabs.find((tab) => tab.id === storedNav.tool) ?? tabs[0];
  const nav = useMemo(() => normalizeNav({ ...storedNav, tool: active?.id }), [storedNav, active?.id]);
  const latest = useRef({ nav, onNavChange });
  latest.current = { nav, onNavChange };

  const navigate = useCallback((patch: Partial<EditorNav>) => {
    const next = normalizeNav({ ...latest.current.nav, ...patch });
    latest.current = { ...latest.current, nav: next };
    setLocalNav(next);
    latest.current.onNavChange?.(next);
  }, []);

  const registerTab = useCallback((tab: EditorTabDefinition) => {
    setRegistered((current) => [...current.filter((entry) => entry.id !== tab.id), tab]);
    return () => setRegistered((current) => current.filter((entry) => entry !== tab));
  }, []);

  const context = useMemo(() => ({ nav, navigate, registerTab }), [nav, navigate, registerTab]);
  const collapsed = nav.collapsed === true;

  useEffect(() => {
    const list = tabList.current;
    if (!list || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => {
      list.removeAttribute('data-compact');
      list.toggleAttribute('data-compact', list.scrollWidth > list.clientWidth + 1);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(list);
    fit();
    return () => observer.disconnect();
  }, [tabs, collapsed, t]);

  const onTabKeyDown = (event: KeyboardEvent, index: number) => {
    const next = nextIndex(event.key, index, tabs.length);
    if (next === undefined) return;
    event.preventDefault();
    navigate({ tool: tabs[next].id, collapsed: undefined });
    tabList.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  const onResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
    setWidth(clampSidebarWidth(event.clientX - left));
  };

  const onResizeKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowLeft: -SIDEBAR_WIDTH.step, ArrowRight: SIDEBAR_WIDTH.step }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    setWidth((current) => clampSidebarWidth(current + step));
  };

  return (
    <ThemeProvider theme={theme} className="ds-editor-theme">
      <EditorShellContext.Provider value={context}>
        <section
          className={['ds-editor', className].filter(Boolean).join(' ')}
          style={{ ...style, '--ds-editor-sidebar-size': `${width}px` } as CSSProperties}
          aria-label={label ?? t('shell.label')}
          data-collapsed={collapsed ? '' : undefined}
          data-testid="ds-editor"
        >
          <header className="ds-editor__bar">
            <div className="ds-editor__bar-start">{start}</div>
            <div className="ds-editor__bar-actions">
              {actions}
              {status && (
                <span className="ds-editor__status" role="status" data-status={status}>
                  {STATUS_ICONS[status]}
                  <span className="ds-editor__status-text">{t(`status.${status}`)}</span>
                </span>
              )}
            </div>
            <div className="ds-editor__bar-end">{end}</div>
          </header>
          <div className="ds-editor__body">
            <aside className="ds-editor__sidebar" aria-label={t('shell.sidebar')}>
              <div className="ds-editor__tabs">
                <div
                  ref={tabList}
                  role="tablist"
                  aria-label={t('shell.tools')}
                  aria-orientation={collapsed ? 'vertical' : 'horizontal'}
                  className="ds-editor__tablist"
                >
                  {tabs.map((tab, index) => {
                    const selected = tab.id === active?.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={tabId(tab.id)}
                        className="ds-editor__tab"
                        aria-selected={selected}
                        aria-controls={panelId}
                        tabIndex={selected ? 0 : -1}
                        title={t(tab.label)}
                        data-testid={`ds-editor-tab-${tab.id}`}
                        onClick={() => navigate({ tool: tab.id, collapsed: undefined })}
                        onKeyDown={(event) => onTabKeyDown(event, index)}
                      >
                        {tab.icon}
                        <span className="ds-editor__tab-label">{t(tab.label)}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="ds-editor__collapse"
                  aria-expanded={!collapsed}
                  aria-controls={panelId}
                  aria-label={t(collapsed ? 'shell.expand' : 'shell.collapse')}
                  title={t(collapsed ? 'shell.expand' : 'shell.collapse')}
                  data-testid="ds-editor-collapse"
                  onClick={() => navigate({ collapsed: collapsed ? undefined : true })}
                >
                  {collapsed ? (
                    <PanelLeftOpen size={18} aria-hidden="true" />
                  ) : (
                    <PanelLeftClose size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
              <div
                id={panelId}
                role="tabpanel"
                className="ds-editor__panel"
                aria-labelledby={active && tabId(active.id)}
                hidden={collapsed}
                data-testid={active && `ds-editor-panel-${active.id}`}
              >
                {active?.panel}
              </div>
            </aside>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={t('shell.resize')}
              aria-valuemin={SIDEBAR_WIDTH.min}
              aria-valuemax={SIDEBAR_WIDTH.max}
              aria-valuenow={width}
              tabIndex={collapsed ? -1 : 0}
              className="ds-editor__resizer"
              onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
              onPointerMove={onResizeMove}
              onKeyDown={onResizeKeyDown}
            />
            <div className="ds-editor__stage">{children}</div>
          </div>
        </section>
      </EditorShellContext.Provider>
    </ThemeProvider>
  );
};

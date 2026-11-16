# @schablone/3d-studio-feature-editor

Authoring tools for 3D Studio: a split-view editor shell and three editor features (materials, highlights,
scene settings) that edit a scene live in the viewer. The editor never stores anything. The host passes a
`value`, gets every finished edit through `onChange`, and saves it.

```tsx
import '@schablone/3d-studio-feature-editor/style.css';
import {
  Editor,
  editorNavFromSearch,
  editorNavToSearch,
  highlightEditor,
  materialAssignment,
  parseEditorValue,
  sceneSettings,
} from '@schablone/3d-studio-feature-editor';

const tools = [materialAssignment.use({ library }), highlightEditor.use({ locales: ['de', 'en'] }), sceneSettings];

const Page = ({ stored }: { stored: unknown }) => {
  const [value, setValue] = useState(() => parseEditorValue(stored));
  const [nav, setNav] = useState(() => editorNavFromSearch(location.search));
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  return (
    <Editor
      source={glbUrl}
      features={viewerFeatures}
      tools={tools}
      tabs={[{ id: 'model', label: 'Model', panel: <ModelPanel /> }]}
      tabOrder={['model', 'materials', 'highlights', 'settings']}
      value={value}
      onChange={(next) => {
        setValue(next);
        setStatus('saving');
        save(next).then(
          () => setStatus('saved'),
          () => setStatus('error'),
        );
      }}
      nav={nav}
      onNavChange={(next) => {
        setNav(next);
        history.replaceState(null, '', `?${editorNavToSearch(next, location.search)}`);
      }}
      status={status}
      end={<PublishButton />}
    />
  );
};
```

Keep `tools`, `features` and `tabs` stable (module constants or `useMemo`).

## Layout

`EditorShell` is a top bar (`start`, `actions`, `end`), a collapsible and resizable sidebar on the left whose
tabs are the tools, and the 3D stage beside it. Nothing is laid over the stage except handles that belong to
the selected object. Below 64rem the sidebar is a sheet under the stage. Host panels are ordinary tabs
(`tabs`, any React node); editor features add theirs through the `editor.tabs` slot (`editorTabSlots`).

## Value and changes

`EditorValue = { featureConfig, openingCamera?, materials }`. `onChange(value, change)` is called for finished
edits only: a drag end, a blur, a toggle, an undo. Typing and dragging show live but are not reported. One
finished edit is one undo entry. `useEditor()` exposes `undo`, `redo`, `canUndo`, `canRedo`, `emit`, `flush`
and `discard`; `EditorHistoryButtons` and Ctrl+Z / Ctrl+Shift+Z use them.

`EditorChange` is one of `highlights`, `materials`, `feature-config`, `opening-camera` and `restore` (undo and
redo). The same change is emitted on the viewer store as `editor:change`.

## Navigation

`nav = { tool?, highlight?, part?, mode?, collapsed? }` is controlled (`nav` / `onNavChange`) or kept by the
shell (`defaultNav`). `mode` is one of `select`, `add`, `move-anchor`, `pointer`, `pick-part`, `shot`.
`editorNavToSearch(nav, base?, prefix?)` writes it into query params (`tool`, `highlight`, `part`, `mode`,
`collapsed=1`) next to the host's own; `editorNavFromSearch(search, prefix?)` reads it back and drops anything
malformed. `part` holds one or several part keys (`encodePartKeys` / `partKeysOf`).

## Runtime overrides

While editing, behaviour that gets in the way is off in the editor's viewport even when the stored config
enables it: automatic camera rotation, animation autoplay, hover reactions of highlights and the viewer's
highlight callout and selector. The stored and emitted `featureConfig` keeps the real values, and the scene
settings tab edits them. Pass `overrides` to change the list (`defaultRuntimeOverrides`, `runtimeOverrides`,
or your own `{ id, featureId, config }` entries).

## Highlight text

A highlight's `description` is Markdown per locale (a plain string or a map of locale to text; plain text is
valid Markdown). The viewer renders bold, italic, lists, small headings, links, images and two directives;
raw HTML is dropped and URLs are limited to http, https, mailto and relative ones:

```md
::video{src="https://youtu.be/…"}
::action[Label]{type="highlight" target="<id>|next|previous"}
::action[Label]{type="link" href="https://…"}
::action[Label]{type="variant" name="<variant>"}
::action[Label]{type="animation" clip="<clip>"}
::action{type="tool" id="<model tool id>"}
```

The highlight tab edits this text in a WYSIWYG editor (TipTap) with videos and actions as blocks, and lists
the actions of the text in the section "Actions"; both are views of the same Markdown. Text edits are
reported once, when the editor loses focus.

## Helper colours in the canvas

Outlines, the shot frustum and gizmo accents read `--ds-editor-handle-color` (else `--ds-editor-accent`) from
the theme at render time and follow it when it changes (`useHelperColor`). `materialAssignment` takes
`selectionColor` to fix the outline colour instead.

## Locale of the viewer chrome

`Editor` passes its `locale` to the viewer (`<Viewer locale labels>`: menu names, retry) and to the features
that take a `locale` in their config (highlights, light scenarios, beauty shot, ambient occlusion) unless the stored config
sets one. Outside the editor a host sets the same: `<Viewer locale="de" />` and
`featureConfig={{ 'beauty-shot': { locale: 'de', labels: { render: '…' } } }}`.

## Keyboard

| Key                             | Action                                      |
| ------------------------------- | ------------------------------------------- |
| Esc                             | Cancel the mode, else deselect              |
| Delete                          | Delete the selected highlight               |
| `[` `]` or K J                  | Previous / next highlight                   |
| F                               | Fly to the shot of the selected highlight   |
| Arrow keys on a handle          | Nudge it in screen space (Shift: ten times) |
| Alt+Up / Alt+Down on a list row | Move the highlight                          |
| Ctrl+Z / Ctrl+Shift+Z           | Undo / redo                                 |
| Arrow keys in the swatch grid   | Move; Enter applies, Esc ends the preview   |

## Theming

Every colour, size and radius is a CSS custom property with a default. Set them on the editor
(`className` or `style`); the shared UI primitives inside the editor follow them. The viewer in the stage
keeps its own theme (`viewerTheme`).

| Variable                       | Default                      | Used for                                   |
| ------------------------------ | ---------------------------- | ------------------------------------------ |
| `--ds-editor-font`             | `--ds-font-family-base`      | Font family                                |
| `--ds-editor-font-size`        | `--ds-font-size-2`           | Base font size                             |
| `--ds-editor-text`             | `--ds-color-text`            | Text                                       |
| `--ds-editor-text-muted`       | `--ds-color-text-muted`      | Secondary text, inactive tabs              |
| `--ds-editor-bg`               | `--ds-color-surface`         | Top bar and editor background              |
| `--ds-editor-panel-bg`         | `--ds-color-surface-raised`  | Sidebar                                    |
| `--ds-editor-control-bg`       | `--ds-color-surface`         | Inputs, buttons, chips                     |
| `--ds-editor-stage-bg`         | `--ds-color-surface-raised`  | Behind the viewer, thumbnails              |
| `--ds-editor-line`             | `--ds-color-border`          | Borders and separators                     |
| `--ds-editor-primary`          | `--ds-color-accent`          | Active tab, links, selected controls       |
| `--ds-editor-primary-hover`    | `--ds-color-accent-hover`    | Hover of primary elements                  |
| `--ds-editor-primary-contrast` | `--ds-color-accent-contrast` | Text on primary                            |
| `--ds-editor-accent`           | `--ds-color-focus`           | Focus rings, drop markers, status hints    |
| `--ds-editor-danger`           | `--ds-color-danger`          | Errors, rejected drops                     |
| `--ds-editor-hover-bg`         | 8% of `--ds-editor-primary`  | Hovered rows                               |
| `--ds-editor-selected-bg`      | 14% of `--ds-editor-primary` | Selected rows and swatches                 |
| `--ds-editor-radius`           | `--ds-radius-control`        | Corner radius of everything                |
| `--ds-editor-gutter`           | `--ds-space-4`               | Padding of bar and sidebar                 |
| `--ds-editor-gap`              | `--ds-space-3`               | Gap between panel blocks                   |
| `--ds-editor-bar-size`         | `3rem`                       | Height of the top bar                      |
| `--ds-editor-sidebar-size`     | `22rem` (set by resizing)    | Width of the sidebar                       |
| `--ds-editor-strip-size`       | `3rem`                       | Width of the collapsed sidebar             |
| `--ds-editor-sheet-size`       | `45%`                        | Height of the sidebar below 64rem          |
| `--ds-editor-swatch-size`      | `5.5rem`                     | Minimum width of a material swatch         |
| `--ds-editor-handle-size`      | `2.75rem`                    | Hit area of viewport handles               |
| `--ds-editor-handle-color`     | `--ds-editor-accent`         | Handles, shot preview frame                |
| `--ds-editor-handle-contrast`  | `--ds-editor-bg`             | Text on the handle colour                  |
| `--ds-editor-shadow`           | `--ds-shadow-2`              | Toolbar, banner and preview over the stage |

Toolbar, banner and shot preview over the stage are viewer chrome: they take the viewer's tokens
(`--ds-color-surface-overlay`, `--ds-panel-color`, `--ds-panel-radius`), so `viewerTheme` styles them together
with the viewer's own menus.

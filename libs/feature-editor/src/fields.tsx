import { type ReactNode, useId } from 'react';
import { ChevronLeft } from 'lucide-react';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export interface TextInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Called when the field loses focus: the edit is finished. */
  onCommit?: () => void;
  /** Accessible name when there is no visible label. */
  label?: string;
  placeholder?: string;
  type?: 'text' | 'search';
  required?: boolean;
  /** Takes focus and selects its text when it appears. */
  focused?: boolean;
  /** Renders a text area with this many rows. */
  rows?: number;
  testId?: string;
}

const focusAndSelect = (element: HTMLInputElement | HTMLTextAreaElement | null) => {
  if (element && document.activeElement !== element) {
    element.focus();
    element.select();
  }
};

/** Single-line or multi-line text control in the editor's look. */
export const TextInput = ({
  id,
  value,
  onValueChange,
  onCommit,
  label,
  placeholder,
  type = 'text',
  required,
  focused,
  rows,
  testId,
}: TextInputProps) =>
  rows ? (
    <textarea
      id={id}
      ref={focused ? focusAndSelect : undefined}
      className="ds-editor-input"
      rows={rows}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      required={required}
      data-testid={testId}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={onCommit}
    />
  ) : (
    <input
      id={id}
      ref={focused ? focusAndSelect : undefined}
      className="ds-editor-input"
      type={type}
      value={value}
      aria-label={label}
      placeholder={placeholder}
      required={required}
      data-testid={testId}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={onCommit}
    />
  );

export interface NumberInputProps {
  id?: string;
  value: number;
  onValueChange: (value: number) => void;
  onCommit?: () => void;
  /** Accessible name when there is no visible label. */
  label?: string;
  step?: number;
}

const DISPLAY_DIGITS = 4;

/** Numeric control; ignores input that is not a finite number. */
export const NumberInput = ({ id, value, onValueChange, onCommit, label, step }: NumberInputProps) => (
  <input
    id={id}
    className="ds-editor-input ds-editor-input--number"
    type="number"
    step={step}
    value={Number(value.toFixed(DISPLAY_DIGITS))}
    aria-label={label}
    onChange={(event) => {
      const next = event.target.valueAsNumber;
      if (Number.isFinite(next)) onValueChange(next);
    }}
    onBlur={onCommit}
  />
);

export interface ColorInputProps {
  id?: string;
  /** `#rrggbb`; anything else shows `fallback`. */
  value: string | undefined;
  fallback?: string;
  onValueChange: (value: string) => void;
  onCommit?: () => void;
  /** Accessible name when there is no visible label. */
  label?: string;
  testId?: string;
}

/** Native colour picker reporting lower-case `#rrggbb`. */
export const ColorInput = ({
  id,
  value,
  fallback = '#000000',
  onValueChange,
  onCommit,
  label,
  testId,
}: ColorInputProps) => (
  <input
    id={id}
    className="ds-editor-color"
    type="color"
    value={value && HEX_COLOR.test(value) ? value : fallback}
    aria-label={label}
    data-testid={testId}
    onChange={(event) => onValueChange(event.target.value.toLowerCase())}
    onBlur={onCommit}
  />
);

/** Finishes an edit when a pointer or key is released inside it, for controls that only report changes. */
export const CommitOnRelease = ({ onCommit, children }: { onCommit: () => void; children?: ReactNode }) => (
  <div role="presentation" className="ds-editor-commit" onPointerUp={onCommit} onKeyUp={onCommit} onBlur={onCommit}>
    {children}
  </div>
);

export interface FieldGroupProps {
  title: string;
  /** Controls shown beside the title. */
  actions?: ReactNode;
  /** Draws the group as a card with label and control side by side in each row. */
  card?: boolean;
  children?: ReactNode;
}

/** A titled group of related controls. */
export const FieldGroup = ({ title, actions, card = false, children }: FieldGroupProps) => {
  const titleId = useId();
  return (
    <div role="group" aria-labelledby={titleId} className="ds-editor-group" data-card={card ? '' : undefined}>
      <div className="ds-editor-group__header">
        <h3 id={titleId} className="ds-editor-group__title">
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </div>
  );
};

export interface SubViewHeaderProps {
  /** Text of the back link. */
  back: string;
  onBack: () => void;
  title: ReactNode;
  /** Controls at the end of the header, e.g. previous and next. */
  actions?: ReactNode;
}

/** Header of a detail view that replaced a list: a back link, the title and its actions. */
export const SubViewHeader = ({ back, onBack, title, actions }: SubViewHeaderProps) => (
  <div className="ds-editor-subview">
    <button type="button" className="ds-editor-back" data-testid="ds-editor-back" onClick={onBack}>
      <ChevronLeft size={16} aria-hidden="true" />
      {back}
    </button>
    <div className="ds-editor-subview__row">
      <h3 className="ds-editor-subview__title">{title}</h3>
      {actions && <div className="ds-editor-row">{actions}</div>}
    </div>
  </div>
);

/** A row of buttons or controls that wraps. */
export const Row = ({ children }: { children?: ReactNode }) => <div className="ds-editor-row">{children}</div>;

/** Vertical stack of panel content. */
export const Stack = ({ children }: { children?: ReactNode }) => <div className="ds-editor-stack">{children}</div>;

/** Secondary explanatory text. */
export const Hint = ({ children, status = false }: { children?: ReactNode; status?: boolean }) => (
  <p className="ds-editor-hint" role={status ? 'status' : undefined} data-status={status ? '' : undefined}>
    {children}
  </p>
);

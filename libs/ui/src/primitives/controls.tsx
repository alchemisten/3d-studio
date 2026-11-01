import { useId, type ReactNode } from 'react';
import * as RadixAccordion from '@radix-ui/react-accordion';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import * as RadixPopover from '@radix-ui/react-popover';
import * as RadixSelect from '@radix-ui/react-select';
import * as RadixSlider from '@radix-ui/react-slider';
import * as RadixSwitch from '@radix-ui/react-switch';
import * as RadixTabs from '@radix-ui/react-tabs';
import * as RadixToggleGroup from '@radix-ui/react-toggle-group';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { usePortalContainer } from '../theme';
import { cx } from './cx';

interface Base {
  className?: string;
  /** Rendered as `data-testid`. */
  testId?: string;
}

export interface FieldProps extends Base {
  label: ReactNode;
  children: (id: string) => ReactNode;
  /** Layout of label and control. */
  orientation?: 'horizontal' | 'vertical';
}

/** Label plus control row used by menus and settings panels. */
export const Field = ({ label, children, className, testId, orientation = 'horizontal' }: FieldProps) => {
  const id = useId();
  return (
    <div className={cx('ds-field', className)} data-orientation={orientation} data-testid={testId}>
      <label className="ds-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="ds-field__control">{children(id)}</div>
    </div>
  );
};

export interface SwitchProps extends Base {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
  /** Visual only: removed from the tab order and accessibility tree (a parent row handles interaction). */
  decorative?: boolean;
}

export const Switch = ({ checked, onCheckedChange, label, id, disabled, decorative, className, testId }: SwitchProps) => (
  <RadixSwitch.Root
    id={id}
    aria-label={decorative ? undefined : label}
    aria-hidden={decorative || undefined}
    tabIndex={decorative ? -1 : undefined}
    checked={checked}
    disabled={disabled}
    onCheckedChange={onCheckedChange}
    className={cx('ds-switch', className)}
    data-testid={testId}
  >
    <RadixSwitch.Thumb className="ds-switch__thumb" />
  </RadixSwitch.Root>
);

export interface CheckboxProps extends Base {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
}

export const Checkbox = ({ checked, onCheckedChange, label, id, disabled, className, testId }: CheckboxProps) => (
  <RadixCheckbox.Root
    id={id}
    aria-label={label}
    checked={checked}
    disabled={disabled}
    onCheckedChange={(value) => onCheckedChange(value === true)}
    className={cx('ds-checkbox', className)}
    data-testid={testId}
  >
    <RadixCheckbox.Indicator className="ds-checkbox__indicator">
      <Check size={14} aria-hidden="true" />
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
);

export interface SliderProps extends Base {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  disabled?: boolean;
}

export const Slider = ({ value, onValueChange, min = 0, max = 100, step = 1, label, disabled, className, testId }: SliderProps) => (
  <RadixSlider.Root
    value={[value]}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
    onValueChange={([next]) => onValueChange(next)}
    className={cx('ds-slider', className)}
    data-testid={testId}
  >
    <RadixSlider.Track className="ds-slider__track">
      <RadixSlider.Range className="ds-slider__range" />
    </RadixSlider.Track>
    <RadixSlider.Thumb className="ds-slider__thumb" aria-label={label} />
  </RadixSlider.Root>
);

export interface SelectOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends Base {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

export const Select = ({ value, onValueChange, options, label, placeholder, id, disabled, className, testId }: SelectProps) => {
  const container = usePortalContainer();
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger id={id} aria-label={label} className={cx('ds-select', className)} data-testid={testId}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="ds-select__icon">
          <ChevronDown size={16} aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal container={container}>
        <RadixSelect.Content className="ds-select__content" position="popper" sideOffset={4}>
          <RadixSelect.Viewport className="ds-select__viewport">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="ds-select__item"
                data-testid={testId && `${testId}-option-${option.value}`}
              >
                {option.icon}
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
};

export interface SegmentedOption {
  value: string;
  label?: ReactNode;
  icon?: ReactNode;
  /** Required when there is no text label. */
  ariaLabel?: string;
}

export interface SegmentedControlProps extends Base {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentedOption[];
  label: string;
}

export const SegmentedControl = ({ value, onValueChange, options, label, className, testId }: SegmentedControlProps) => (
  <RadixToggleGroup.Root
    type="single"
    value={value}
    // Radix emits '' when the active item is clicked again; a segmented control always has a selection.
    onValueChange={(next) => next && onValueChange(next)}
    aria-label={label}
    className={cx('ds-segmented', className)}
    data-testid={testId}
  >
    {options.map((option) => (
      <RadixToggleGroup.Item
        key={option.value}
        value={option.value}
        aria-label={option.ariaLabel}
        className="ds-segmented__item"
        data-testid={testId && `${testId}-${option.value}`}
      >
        {option.icon}
        {option.label}
      </RadixToggleGroup.Item>
    ))}
  </RadixToggleGroup.Root>
);

export interface StepperProps extends Base {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (value: number) => ReactNode;
}

export const Stepper = ({ value, onValueChange, min = -Infinity, max = Infinity, step = 1, label, format, className, testId }: StepperProps) => {
  const set = (next: number) => onValueChange(Math.min(max, Math.max(min, Number(next.toFixed(10)))));
  return (
    <div className={cx('ds-stepper', className)} role="group" aria-label={label} data-testid={testId}>
      <button type="button" className="ds-stepper__button" aria-label={`Decrease ${label}`} disabled={value <= min} data-testid={testId && `${testId}-dec`} onClick={() => set(value - step)}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <output className="ds-stepper__value" aria-live="polite">
        {format ? format(value) : value}
      </output>
      <button type="button" className="ds-stepper__button" aria-label={`Increase ${label}`} disabled={value >= max} data-testid={testId && `${testId}-inc`} onClick={() => set(value + step)}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
}

export interface TabsProps extends Base {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label: string;
}

export const Tabs = ({ items, value, defaultValue, onValueChange, label, className, testId }: TabsProps) => (
  <RadixTabs.Root value={value} defaultValue={defaultValue ?? items[0]?.value} onValueChange={onValueChange} className={cx('ds-tabs', className)} data-testid={testId}>
    <RadixTabs.List className="ds-tabs__list" aria-label={label}>
      {items.map((item) => (
        <RadixTabs.Trigger key={item.value} value={item.value} className="ds-tabs__trigger" data-testid={testId && `${testId}-tab-${item.value}`}>
          {item.icon}
          {item.label}
        </RadixTabs.Trigger>
      ))}
    </RadixTabs.List>
    {items.map((item) => (
      <RadixTabs.Content key={item.value} value={item.value} className="ds-tabs__content">
        {item.content}
      </RadixTabs.Content>
    ))}
  </RadixTabs.Root>
);

export interface PopoverProps extends Base {
  trigger: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** `trigger` must be a single focusable element (it is rendered with `asChild`). */
export const Popover = ({ trigger, children, side = 'top', align = 'center', open, onOpenChange, className, testId }: PopoverProps) => {
  const container = usePortalContainer();
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal container={container}>
        <RadixPopover.Content side={side} align={align} sideOffset={8} className={cx('ds-popover', className)} data-testid={testId}>
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};

export interface ColorSelectProps extends Base {
  value: string;
  onValueChange: (value: string) => void;
  /** Preset swatches (CSS colors). */
  colors: string[];
  label: string;
  /** Also offer the native color picker for arbitrary colors. */
  custom?: boolean;
}

export const ColorSelect = ({ value, onValueChange, colors, label, custom = false, className, testId }: ColorSelectProps) => (
  <div className={cx('ds-color-select', className)} role="radiogroup" aria-label={label} data-testid={testId}>
    {colors.map((color) => (
      <button
        key={color}
        type="button"
        role="radio"
        aria-checked={color === value}
        aria-label={color}
        className="ds-color-select__swatch"
        data-active={color === value ? '' : undefined}
        data-testid={testId && `${testId}-${color}`}
        style={{ '--ds-swatch-color': color } as React.CSSProperties}
        onClick={() => onValueChange(color)}
      />
    ))}
    {custom && (
      <input type="color" aria-label={`${label} (custom)`} className="ds-color-select__custom" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onValueChange(e.target.value)} />
    )}
  </div>
);

export interface AccordionSection {
  value: string;
  title: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
}

export interface AccordionProps extends Base {
  sections: AccordionSection[];
  /** Sections open initially. Several can be open at once unless `single` is set. */
  defaultOpen?: string[];
  single?: boolean;
}

/** Collapsible sections, e.g. to group settings in a menu or panel. */
export const Accordion = ({ sections, defaultOpen = [], single = false, className, testId }: AccordionProps) => {
  const items = sections.map((section) => (
    <RadixAccordion.Item key={section.value} value={section.value} className="ds-accordion__item" data-testid={testId && `${testId}-section-${section.value}`}>
      <RadixAccordion.Header className="ds-accordion__header">
        <RadixAccordion.Trigger className="ds-accordion__trigger">
          {section.icon}
          <span className="ds-accordion__title">{section.title}</span>
          <ChevronDown size={16} className="ds-accordion__chevron" aria-hidden="true" />
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>
      <RadixAccordion.Content className="ds-accordion__content">{section.content}</RadixAccordion.Content>
    </RadixAccordion.Item>
  ));
  return single ? (
    <RadixAccordion.Root type="single" collapsible defaultValue={defaultOpen[0]} className={cx('ds-accordion', className)} data-testid={testId}>
      {items}
    </RadixAccordion.Root>
  ) : (
    <RadixAccordion.Root type="multiple" defaultValue={defaultOpen} className={cx('ds-accordion', className)} data-testid={testId}>
      {items}
    </RadixAccordion.Root>
  );
};

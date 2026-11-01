import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  Button,
  Checkbox,
  ColorSelect,
  List,
  Loader,
  MenuCheckboxItem,
  ProgressBar,
  SegmentedControl,
  Stepper,
  Switch,
  Tabs,
  ThemeProvider,
} from '../index';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('primitives', () => {
  it('Switch toggles and exposes state', () => {
    const onChange = vi.fn();
    wrap(<Switch checked={false} onCheckedChange={onChange} label="Wireframe" />);
    const control = screen.getByRole('switch', { name: 'Wireframe' });
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Checkbox reports boolean values', () => {
    const onChange = vi.fn();
    wrap(<Checkbox checked={false} onCheckedChange={onChange} label="Shadows" />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shadows' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('MenuCheckboxItem toggles once per click and shows a switch', () => {
    const Demo = () => {
      const [on, setOn] = useState(false);
      return <MenuCheckboxItem label="Sky" checked={on} onChange={setOn} />;
    };
    wrap(<Demo />);
    const row = screen.getByRole('menuitemcheckbox', { name: /Sky/ });
    fireEvent.click(row);
    expect(row.getAttribute('aria-checked')).toBe('true');
    expect(row.querySelector('.ds-switch')).toBeTruthy();
  });

  it('SegmentedControl keeps a selection when the active item is clicked again', () => {
    const onChange = vi.fn();
    wrap(
      <SegmentedControl
        label="Mode"
        value="a"
        onValueChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );
    fireEvent.click(screen.getByText('A'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('B'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('Stepper clamps to its range', () => {
    const onChange = vi.fn();
    wrap(<Stepper label="Speed" value={2} min={0} max={2} onValueChange={onChange} />);
    expect((screen.getByLabelText('Increase Speed') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Decrease Speed'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('List marks the active item and selects', () => {
    const onSelect = vi.fn();
    wrap(<List label="Views" activeId="b" onSelect={onSelect} items={[{ id: 'a', label: 'A', color: '#f00' }, { id: 'b', label: 'B', icon: <i /> }]} />);
    expect(screen.getByRole('option', { name: 'B' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('option', { name: 'A' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('ColorSelect picks a swatch', () => {
    const onChange = vi.fn();
    wrap(<ColorSelect label="Accent" value="#f00" colors={['#f00', '#0f0']} onValueChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: '#0f0' }));
    expect(onChange).toHaveBeenCalledWith('#0f0');
  });

  it('Tabs render the active panel', () => {
    wrap(<Tabs label="Settings" items={[{ value: 'a', label: 'A', content: 'panel a' }, { value: 'b', label: 'B', content: 'panel b' }]} />);
    expect(screen.getByText('panel a')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'B' })).toBeTruthy();
  });

  it('Accordion opens sections', () => {
    wrap(<Accordion sections={[{ value: 'a', title: 'Section A', content: 'body a' }]} />);
    expect(screen.queryByText('body a')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Section A/ }));
    expect(screen.getByText('body a')).toBeTruthy();
  });

  it('ProgressBar and Loader expose progress', () => {
    wrap(
      <>
        <ProgressBar label="Model" value={40} />
        <Loader progress={40} title="Loading model" detail="12 / 30 MB" />
      </>,
    );
    expect(screen.getAllByRole('progressbar')[0].getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByText('40%')).toBeTruthy();
  });

  it('Button disables itself while loading', () => {
    wrap(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: /Save/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});

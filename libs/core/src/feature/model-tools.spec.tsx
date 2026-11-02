import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ViewerContext, ViewerStore } from '../store';
import { indexModelTools, ModelToolContext, ModelToolControls, ToolConfigurationError, useModelTools, type ModelTool } from './model-tools';

const tool = (id: string, available: ModelTool['available'] = () => true): ModelTool => ({
  id,
  available,
  render: (surface) => <span>{id}-{surface} </span>,
});

const Controls = ({ ids }: { ids?: string[] }) => <ModelToolControls tools={useModelTools(ids)} surface="inline" />;

const controls = (store: ViewerStore, tools: ModelTool[], ids?: string[]) => (
  <ViewerContext.Provider value={store}>
    <ModelToolContext.Provider value={indexModelTools(tools)}>
      <Controls ids={ids} />
    </ModelToolContext.Provider>
  </ViewerContext.Provider>
);

describe('model tools', () => {
  it('resolves requested order and updates availability per viewer', () => {
    const store = new ViewerStore();
    const tools = [tool('first'), tool('conditional', (state) => !!state.featureEnabled.conditional), tool('last')];
    const { container } = render(<>
      {controls(store, tools, ['last', 'conditional', 'first'])}
      {controls(new ViewerStore(), tools)}
    </>);
    expect(container.textContent).toBe('last-inline first-inline first-inline last-inline ');
    act(() => store.setState({ featureEnabled: { conditional: true } }));
    expect(container.textContent).toBe('last-inline conditional-inline first-inline first-inline last-inline ');
  });

  it('rejects duplicate registrations', () => {
    expect(() => indexModelTools([tool('same'), tool('same')])).toThrow(ToolConfigurationError);
  });

  it('rejects an unknown requested tool', () => {
    expect(() => render(controls(new ViewerStore(), [], ['missing']))).toThrow(ToolConfigurationError);
  });
});

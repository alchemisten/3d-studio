import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useRef, useState } from 'react';
import type { ViewerQuery } from '@schablone/3d-studio-core';
import { Button } from '@schablone/3d-studio-ui';
import { variantsShoe } from '../../../samples/variants-shoe';
import { Example, StoryScene } from '../shared/story-scene';

const SettingsLink = () => {
  const [search, setSearch] = useState('variant=street&color=sage');
  const params = useRef(new URLSearchParams(search));
  const listeners = useMemo(() => new Set<() => void>(), []);
  const update = (next: URLSearchParams) => {
    params.current = next;
    setSearch(next.toString());
  };
  const host = useMemo<ViewerQuery>(
    () => ({
      key: (id, key) => (id === 'body-tint' ? 'color' : key),
      read: () => params.current,
      replace: update,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    }),
    [listeners],
  );
  return (
    <Example
      title="Share a configured scene"
      hint="Change the material in Customize to update the link below. Reset link simulates host navigation and restores the authored defaults."
    >
      <div className="studio-example__routing">
        <div className="studio-example__address">
          <code>/scenes/variants-shoe{search && '?' + search}</code>
          <Button
            onClick={() => {
              update(new URLSearchParams());
              listeners.forEach((listener) => listener());
            }}
          >
            Reset link
          </Button>
        </div>
        <StoryScene scene={variantsShoe} query={host} />
      </div>
    </Example>
  );
};
export default { title: 'Integration/Router and share links' } satisfies Meta;
export const RestoreAndShare: StoryObj = { render: () => <SettingsLink /> };

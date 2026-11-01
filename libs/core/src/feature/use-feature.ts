import { createContext, useContext } from 'react';
import type { FeatureContext } from './feature';

export const FeatureReactContext = createContext<FeatureContext<any> | null>(null);

/** Config, viewer store and overlay API of the feature whose `scene` renders this component. */
export const useFeature = <C extends object = Record<string, unknown>>(): FeatureContext<C> => {
  const ctx = useContext(FeatureReactContext);
  if (!ctx) {
    throw new Error('useFeature must be used inside a feature scene.');
  }
  return ctx as FeatureContext<C>;
};

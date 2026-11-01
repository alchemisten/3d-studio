import type { SlotContent, SlotFill, SlotMode } from './types';

type Listener = () => void;

const EMPTY: readonly SlotFill[] = Object.freeze([]);

/** Holds dynamically registered slot fills. Snapshots are referentially stable per slot. */
export class SlotStore {
  private readonly fills = new Map<string, readonly SlotFill[]>();
  private readonly listeners = new Set<Listener>();

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public get = (name: string): readonly SlotFill[] => this.fills.get(name) ?? EMPTY;

  public add(name: string, fill: SlotFill): () => void {
    const current = this.get(name).filter((f) => f.id !== fill.id);
    this.fills.set(name, sort([...current, fill]));
    this.emit();
    return () => this.remove(name, fill.id);
  }

  public update(name: string, id: string, patch: { content?: SlotContent; mode?: SlotMode; order?: number }): void {
    const current = this.get(name);
    const existing = current.find((f) => f.id === id);
    if (!existing) {
      return;
    }
    const next = { ...existing, ...definedOnly(patch) };
    if (next.content === existing.content && next.mode === existing.mode && next.order === existing.order) {
      return;
    }
    this.fills.set(name, sort(current.map((f) => (f.id === id ? next : f))));
    this.emit();
  }

  public remove(name: string, id: string): void {
    const current = this.get(name);
    if (!current.some((f) => f.id === id)) {
      return;
    }
    this.fills.set(
      name,
      current.filter((f) => f.id !== id),
    );
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

// Array.prototype.sort is stable, so equal orders keep registration order.
const sort = (fills: SlotFill[]): readonly SlotFill[] => [...fills].sort((a, b) => a.order - b.order);

const definedOnly = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

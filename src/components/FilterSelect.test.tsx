/**
 * Exercises select keyboard, disabled-option and viewport behavior without browser automation.
 * Depends on Vitest and React element handlers with a small hook harness; browser focus remains a manual check.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { FilterSelect } from './FilterSelect';

const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  stateIndex: 0,
  refIndex: 0,
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useId: () => 'filter',
  useEffect: () => {},
  useState: (initial: unknown) => {
    const index = hooks.stateIndex++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [
      hooks.states[index],
      (value: unknown) => {
        hooks.states[index] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = hooks.refIndex++;
    return (hooks.refs[index] ??= { current: initial });
  },
}));

const options = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'brand', label: 'Marque · indisponible', disabled: true },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'updated', label: 'Dernière modification' },
];
const onChange = vi.fn();
const focus = vi.fn();
const showPopover = vi.fn();
const hidePopover = vi.fn();
let style: Record<string, string>;

type Element = ReactElement<Record<string, any>>;
function findElement(node: ReactNode, role: string): Element | undefined {
  if (!node || typeof node !== 'object' || !('props' in node)) return;
  const element = node as Element;
  if (element.props.role === role) return element;
  const children = [element.props.children].flat(Infinity) as ReactNode[];
  for (const child of children) {
    const found = findElement(child, role);
    if (found) return found;
  }
}

function render() {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  const element = FilterSelect({ label: 'Trier par', value: 'recent', options, onChange });
  return { trigger: findElement(element, 'combobox')!, menu: findElement(element, 'listbox')! };
}

function press(key: string) {
  const event = { key, preventDefault: vi.fn() };
  render().trigger.props.onKeyDownCapture(event as unknown as KeyboardEvent<HTMLButtonElement>);
  return event;
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.states = [];
  hooks.refs = [];
  style = {};
  vi.stubGlobal('window', { innerWidth: 390, innerHeight: 700 });
  render();
  hooks.refs[0].current = {
    getBoundingClientRect: () => ({ left: 260, top: 550, bottom: 596, width: 180 }),
    focus,
  };
  hooks.refs[1].current = { style, showPopover, hidePopover };
});

afterEach(() => vi.unstubAllGlobals());

describe('filter select interaction', () => {
  it('connects its label and listbox while starting collapsed', () => {
    const { trigger, menu } = render();
    expect(trigger.props['aria-expanded']).toBe(false);
    expect(trigger.props['aria-controls']).toBe(menu.props.id);
    expect(menu.props['aria-labelledby']).toBe('filter-label');
    expect(menu.props.children[1].props['aria-disabled']).toBe(true);
  });

  it('skips disabled options and commits only after Enter', () => {
    press('ArrowDown');
    expect(showPopover).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    render().menu.props.onBeforeToggle({ newState: 'open' });
    expect(render().trigger.props['aria-activedescendant']).toBe('filter-option-2');
    press('Enter');
    expect(onChange).toHaveBeenCalledWith('oldest');
    expect(hidePopover).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('supports Home, End and Space without selecting unavailable options', () => {
    press('End');
    render().menu.props.onBeforeToggle({ newState: 'open' });
    expect(render().trigger.props['aria-activedescendant']).toBe('filter-option-3');
    press('Home');
    expect(render().trigger.props['aria-activedescendant']).toBe('filter-option-0');
    press('ArrowDown');
    press(' ');
    expect(onChange).toHaveBeenCalledWith('oldest');
  });

  it('consumes Escape before the enclosing filter panel and lets Tab continue', () => {
    render().menu.props.onBeforeToggle({ newState: 'open' });
    const escape = press('Escape');
    expect(escape.preventDefault).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    const tab = press('Tab');
    expect(tab.preventDefault).not.toHaveBeenCalled();
    expect(hidePopover).toHaveBeenCalledTimes(2);
  });

  it('finds French option labels by typing and ignores disabled matches', () => {
    press('d');
    render().menu.props.onBeforeToggle({ newState: 'open' });
    expect(render().trigger.props['aria-activedescendant']).toBe('filter-option-3');
    press('Enter');
    expect(onChange).toHaveBeenCalledWith('updated');
  });

  it('does not select disabled options or repeat the current selection', () => {
    const { menu } = render();
    menu.props.children[1].props.onClick();
    expect(onChange).not.toHaveBeenCalled();
    expect(hidePopover).not.toHaveBeenCalled();
    menu.props.children[0].props.onClick();
    expect(onChange).not.toHaveBeenCalled();
    expect(hidePopover).toHaveBeenCalledOnce();
  });

  it('opens above a low field and keeps the menu within a phone viewport', () => {
    render().trigger.props.onClick();
    expect(style.width).toBe('240px');
    expect(style.left).toBe('138px');
    expect(style.top).toBe('auto');
    expect(style.bottom).toBe('156px');
    expect(style.maxHeight).toBe('320px');
  });
});

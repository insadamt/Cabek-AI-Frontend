/** Verify camera selection precedes capture and saved-photo AI retries bypass it; depends on isolated React hooks. */
import { Children, isValidElement } from 'react';
import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ open: false, setOpen: vi.fn() }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: () => [state.open, state.setOpen],
}));
import { CameraScanAction } from './CameraScanAction';
import { ZoomCameraPicker } from './ZoomCameraPicker';

it('opens selection without starting capture and only forwards confirmed choices', () => {
  const onScan = vi.fn();
  const props = {
    label: 'SCANNER',
    disabled: false,
    dossierId: 'DOS',
    needsCapture: true,
    onScan,
    buttonRef: null,
  };
  state.open = false;
  const tree = CameraScanAction(props);
  tree.props.children[0].props.onClick();
  expect(state.setOpen).toHaveBeenCalledWith(true);
  expect(onScan).not.toHaveBeenCalled();
  state.open = true;
  const picker = Children.toArray(CameraScanAction(props).props.children).find(
    (node) => isValidElement(node) && node.type === ZoomCameraPicker,
  ) as any;
  picker.props.onConfirm([1, 12]);
  expect(onScan).toHaveBeenCalledWith([1, 12]);
});
it('retries analysis directly when a completed capture already exists', () => {
  const onScan = vi.fn();
  const tree = CameraScanAction({
    label: 'RELANCER',
    disabled: false,
    dossierId: 'DOS',
    needsCapture: false,
    onScan,
    buttonRef: null,
  });
  tree.props.children[0].props.onClick();
  expect(onScan).toHaveBeenCalledOnce();
});

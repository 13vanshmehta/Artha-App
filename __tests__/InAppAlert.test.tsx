import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AlertProvider, alert } from '../src/context/AlertContext';
import { AlertHost } from '../src/components/common/AlertHost';

describe('In-App Confirmation Alert System', () => {
  beforeEach(() => {
    alert.dismiss();
  });

  afterEach(() => {
    alert.dismiss();
  });

  it('renders nothing when no alert is active', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AlertProvider>
          <AlertHost />
        </AlertProvider>,
      );
    });

    expect(renderer.root.findAllByProps({ testID: 'in-app-alert-card' })).toHaveLength(0);

    await act(async () => {
      renderer.unmount();
    });
  });

  it('displays the in-app alert card with custom title, message, and buttons', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AlertProvider>
          <AlertHost />
        </AlertProvider>,
      );
    });

    act(() => {
      alert.show({
        title: 'Clear All Notifications',
        message: 'Are you sure you want to remove all notifications?',
        confirmText: 'Clear All',
        cancelText: 'Cancel',
        isDestructive: true,
      });
    });

    const card = renderer.root.findByProps({ testID: 'in-app-alert-card' });
    expect(card).toBeDefined();

    const title = renderer.root.findByProps({ testID: 'in-app-alert-title' });
    expect(title.props.children).toBe('Clear All Notifications');

    const message = renderer.root.findByProps({ testID: 'in-app-alert-message' });
    expect(message.props.children).toBe('Are you sure you want to remove all notifications?');

    const confirmBtn = renderer.root.findByProps({ testID: 'in-app-alert-confirm-btn' });
    expect(confirmBtn).toBeDefined();

    const cancelBtn = renderer.root.findByProps({ testID: 'in-app-alert-cancel-btn' });
    expect(cancelBtn).toBeDefined();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('resolves alert.confirm to true when confirm is tapped', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AlertProvider>
          <AlertHost />
        </AlertProvider>,
      );
    });

    let confirmResult: boolean | null = null;
    act(() => {
      alert
        .confirm({
          title: 'Delete Expense',
          message: 'Are you sure you want to delete this expense?',
          confirmText: 'Delete',
          isDestructive: true,
        })
        .then((res) => {
          confirmResult = res;
        });
    });

    const confirmBtn = renderer.root.findByProps({ testID: 'in-app-alert-confirm-btn' });
    await act(async () => {
      confirmBtn.props.onPress();
    });

    expect(confirmResult).toBe(true);

    await act(async () => {
      renderer.unmount();
    });
  });

  it('resolves alert.confirm to false when cancel is tapped', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AlertProvider>
          <AlertHost />
        </AlertProvider>,
      );
    });

    let confirmResult: boolean | null = null;
    act(() => {
      alert
        .confirm({
          title: 'Delete Expense',
          message: 'Are you sure you want to delete this expense?',
          confirmText: 'Delete',
          isDestructive: true,
        })
        .then((res) => {
          confirmResult = res;
        });
    });

    const cancelBtn = renderer.root.findByProps({ testID: 'in-app-alert-cancel-btn' });
    await act(async () => {
      cancelBtn.props.onPress();
    });

    expect(confirmResult).toBe(false);

    await act(async () => {
      renderer.unmount();
    });
  });
});

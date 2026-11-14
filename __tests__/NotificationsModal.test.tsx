import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationsModal, INITIAL_NOTIFICATIONS } from '../src/screens/NotificationsModal';
import { alert } from '../src/context/AlertContext';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('NotificationsModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    alert.dismiss();
  });

  afterEach(() => {
    jest.useRealTimers();
    alert.dismiss();
  });

  it('renders with header, back button, and Clear All glassy button', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const onClose = jest.fn();
    const onClearAll = jest.fn();

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <NotificationsModal
            visible={true}
            onClose={onClose}
            notifications={INITIAL_NOTIFICATIONS}
            onMarkAsRead={jest.fn()}
            onDeleteNotification={jest.fn()}
            onMarkAllAsRead={jest.fn()}
            onClearAll={onClearAll}
          />
        </SafeAreaProvider>,
      );
    });

    // Verify 3 dots button is NOT present
    const threeDots = renderer.root.findAllByProps({ accessibilityLabel: 'Notification Options' });
    expect(threeDots).toHaveLength(0);

    // Verify Mark as read is NOT present in header
    const markAsRead = renderer.root.findAll((node) => node.props.children === 'Mark all as read');
    expect(markAsRead).toHaveLength(0);

    // Verify Clear All glassy button IS present
    const clearAllBtn = renderer.root.findByProps({ accessibilityLabel: 'Clear All Notifications' });
    expect(clearAllBtn).toBeDefined();
    expect(clearAllBtn.props.disabled).toBe(false);

    // Trigger clear all -> left-to-right animation runs and directly calls onClearAll without confirmation alert
    const confirmSpy = jest.spyOn(alert, 'confirm');

    await act(async () => {
      clearAllBtn.props.onPress();
      jest.runAllTimers();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClearAll).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('deletes individual notification tile with left-to-right animation and without in-app alert', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const onDelete = jest.fn();

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <NotificationsModal
            visible={true}
            onClose={jest.fn()}
            notifications={INITIAL_NOTIFICATIONS}
            onMarkAsRead={jest.fn()}
            onDeleteNotification={onDelete}
            onMarkAllAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </SafeAreaProvider>,
      );
    });

    const deleteButtons = renderer.root.findAllByProps({ accessibilityLabel: 'Delete notification' });
    expect(deleteButtons.length).toBeGreaterThan(0);

    const confirmSpy = jest.spyOn(alert, 'confirm');

    await act(async () => {
      deleteButtons[0].props.onPress();
      jest.runAllTimers();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith(INITIAL_NOTIFICATIONS[0].id);

    confirmSpy.mockRestore();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('disables Clear All button when notification list is empty', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <NotificationsModal
            visible={true}
            onClose={jest.fn()}
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onDeleteNotification={jest.fn()}
            onMarkAllAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </SafeAreaProvider>,
      );
    });

    const clearAllBtn = renderer.root.findByProps({ accessibilityLabel: 'Clear All Notifications' });
    expect(clearAllBtn).toBeDefined();
    expect(clearAllBtn.props.disabled).toBe(true);

    await act(async () => {
      renderer.unmount();
    });
  });
});

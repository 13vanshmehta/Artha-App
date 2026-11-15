import {
  notificationService,
  computeDateGroup,
  formatNotificationTime,
} from '../src/services/notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    notificationService.__resetForTesting([]);
  });

  it('starts with an empty notifications list', () => {
    expect(notificationService.getNotifications()).toEqual([]);
    expect(notificationService.getUnreadCount()).toBe(0);
  });

  it('adds real notifications and notifies subscribers in real-time', async () => {
    const subscriber = jest.fn();
    const unsubscribe = notificationService.subscribe(subscriber);

    // Initial subscribe call
    expect(subscriber).toHaveBeenCalledWith([]);

    const created = await notificationService.addNotification({
      title: 'Expense Recorded',
      message: '₹500 paid for Groceries.',
      iconName: 'ArrowUpRight',
      iconColor: '#EF4444',
      iconBg: '#FEE2E2',
    });

    expect(created.title).toBe('Expense Recorded');
    expect(created.message).toBe('₹500 paid for Groceries.');
    expect(created.read).toBe(false);
    expect(created.id).toBeDefined();
    expect(created.timestamp).toBeDefined();
    expect(created.dateGroup).toBeDefined();

    expect(notificationService.getNotifications()).toHaveLength(1);
    expect(notificationService.getUnreadCount()).toBe(1);
    expect(subscriber).toHaveBeenLastCalledWith([created]);

    unsubscribe();
  });

  it('marks a notification as read and computes unread count', async () => {
    const notif1 = await notificationService.addNotification({
      title: 'Notif 1',
      message: 'Message 1',
    });
    const notif2 = await notificationService.addNotification({
      title: 'Notif 2',
      message: 'Message 2',
    });

    expect(notificationService.getUnreadCount()).toBe(2);

    notificationService.markAsRead(notif1.id);
    expect(notificationService.getUnreadCount()).toBe(1);

    const items = notificationService.getNotifications();
    const updated1 = items.find((i) => i.id === notif1.id);
    const updated2 = items.find((i) => i.id === notif2.id);
    expect(updated1?.read).toBe(true);
    expect(updated2?.read).toBe(false);

    notificationService.markAllAsRead();
    expect(notificationService.getUnreadCount()).toBe(0);
  });

  it('deletes an individual notification and clears all', async () => {
    const notif1 = await notificationService.addNotification({
      title: 'Notif 1',
      message: 'Message 1',
    });
    const notif2 = await notificationService.addNotification({
      title: 'Notif 2',
      message: 'Message 2',
    });

    expect(notificationService.getNotifications()).toHaveLength(2);

    notificationService.deleteNotification(notif1.id);
    expect(notificationService.getNotifications()).toHaveLength(1);
    expect(notificationService.getNotifications()[0].id).toBe(notif2.id);

    notificationService.clearAll();
    expect(notificationService.getNotifications()).toHaveLength(0);
    expect(notificationService.getUnreadCount()).toBe(0);
  });

  it('correctly calculates computeDateGroup dynamically', () => {
    const now = Date.now();
    const todayGroup = computeDateGroup(now);
    expect(todayGroup.startsWith('Today')).toBe(true);

    const yesterdayMs = now - 24 * 60 * 60 * 1000;
    const yesterdayGroup = computeDateGroup(yesterdayMs);
    expect(yesterdayGroup.startsWith('Yesterday')).toBe(true);

    const fourDaysAgoMs = now - 4 * 24 * 60 * 60 * 1000;
    const earlierGroup = computeDateGroup(fourDaysAgoMs);
    expect(earlierGroup).toBe('Earlier this week');

    const tenDaysAgoMs = now - 10 * 24 * 60 * 60 * 1000;
    const olderGroup = computeDateGroup(tenDaysAgoMs);
    expect(olderGroup).toBe('Older');
  });

  it('formats time with am/pm', () => {
    const fixedDate = new Date(2026, 10, 15, 9, 25).getTime();
    expect(formatNotificationTime(fixedDate)).toBe('9:25 am');

    const eveningDate = new Date(2026, 10, 15, 20, 5).getTime();
    expect(formatNotificationTime(eveningDate)).toBe('8:05 pm');
  });
});

// How an app notification becomes an island event. Plain data, so it runs under gjs without the shell.

// GNOME's MessageTray.Urgency
export const URGENCY = {LOW: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3};

/** The island event for a notification, or null when GNOME itself would not show a banner for it. */
export function notificationEvent({title, body, urgency}, appName) {
    if (urgency === URGENCY.LOW)
        return null;
    const text = String(body ?? '').replace(/\s+/g, ' ').trim();
    return {
        title: title || appName,
        subtitle: [appName, text].filter(Boolean).join(' · '),
        kind: urgency === URGENCY.CRITICAL ? 'needs' : 'info',
        seconds: 0,
    };
}

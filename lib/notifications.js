// How an app notification becomes an island event. Plain data, so it runs under gjs without the shell.

// GNOME's MessageTray.Urgency
export const URGENCY = {LOW: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3};

// How much a notification gives away on the island: everything, the title, or only the app name.
export const PRIVACY = ['all', 'title', 'app'];
export const nextPrivacy = level => PRIVACY[(PRIVACY.indexOf(level) + 1) % PRIVACY.length];

/** The island event for a notification, or null when GNOME itself would not show a banner for it. */
export function notificationEvent({title, body, urgency}, appName, level = 'all') {
    if (urgency === URGENCY.LOW)
        return null;
    const kind = urgency === URGENCY.CRITICAL ? 'needs' : 'info';
    if (level === 'app')
        return {title: appName, subtitle: '', kind, seconds: 0};
    const text = level === 'all' ? String(body ?? '').replace(/\s+/g, ' ').trim() : '';
    return {title: title || appName, subtitle: [appName, text].filter(Boolean).join(' · '), kind, seconds: 0};
}

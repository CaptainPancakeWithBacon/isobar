export function workspacePills(count, current) {
    return Array.from({length: count}, (_, index) => ({index, active: index === current}));
}

export function formatDate(date) {
    // gjs's ICU writes "Fri, 16 Oct"; browsers write "Fri 16 Oct"
    return date.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'}).replace(',', '');
}

export function batteryLabel(percentage) {
    if (!Number.isFinite(percentage))
        return '';
    return `${Math.round(Math.min(100, Math.max(0, percentage)))}%`;
}

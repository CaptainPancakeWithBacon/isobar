// Pure part of the Coucou sync: given Coucou's settings file and a colour, the file it should have, or null if it already does.
export function nextCoucouSettings(text, color) {
    let settings;
    try {
        settings = JSON.parse(text);
    } catch (e) {
        return null;   // not ours to repair
    }
    const want = color.toLowerCase();
    if (settings.islandColor === 'custom' && String(settings.islandCustomColor).toLowerCase() === want)
        return null;
    settings.islandColor = 'custom';
    settings.islandCustomColor = want;
    return JSON.stringify(settings, null, 2) + '\n';
}

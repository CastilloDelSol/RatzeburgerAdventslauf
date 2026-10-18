export function formatNumber(value, digits = 0) {
    return new Intl.NumberFormat("de-DE", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(value);
}

export function formatPercent(value, total) {
    return formatNumber(total > 0 ? value / total * 100 : 0, 1) + "%";
}

export function formatDistance(kilometers, digits = 1) {
    return kilometers < 1
        ? formatNumber(kilometers * 1000) + " m"
        : formatNumber(kilometers, digits) + " km";
}

// Durations and seconds since midnight use the same numeric representation.
export function formatTime(value, { showSeconds = true, padHours = true } = {}) {
    if (value == null || !Number.isFinite(value)) return "";
    const seconds = Math.floor(Math.abs(value));
    const pad = number => String(number).padStart(2, "0");
    const hours = Math.floor(seconds / 3600);
    const parts = [padHours ? pad(hours) : String(hours), pad(Math.floor(seconds / 60) % 60)];
    if (showSeconds) parts.push(pad(seconds % 60));
    return (value < 0 ? "−" : "") + parts.join(":");
}

export function formatCheckpointTime(value, { showSeconds = true, timeZone = "Europe/Berlin" } = {}) {
    if (value <= 86400) return formatTime(value, { showSeconds });
    return new Intl.DateTimeFormat("de-DE", {
        timeZone, hour: "2-digit", minute: "2-digit",
        ...(showSeconds ? { second: "2-digit" } : {})
    }).format(new Date(value * 1000));
}

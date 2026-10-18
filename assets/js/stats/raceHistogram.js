import { loadRaceStats } from "./raceStatsLoader.js";
import { replaceChart, resolveElement } from "./chartLifecycle.js";
import { genderColor } from "./chartTheme.js";
import { formatTime } from "./format.js";
import { computeKDE, scaleKDE } from "./kde.js";

/* -------------------------------------------------------
   Render ONE histogram
------------------------------------------------------- */
function renderOneHistogram(canvasId, buckets, gender) {
    const ctx = resolveElement(canvasId);
    if (!ctx) return;

    // Labels "1:10–1:20"
    const labels = buckets.map(b => {
        return `${formatTime(b.range_start, { showSeconds: false, padHours: false })}–${formatTime(b.range_end, { showSeconds: false, padHours: false })}`;
    });

    const counts = buckets.map(b => b.count);

    const xs = buckets.map(b => (b.range_start + b.range_end) / 2);
    const scaled = scaleKDE(computeKDE(xs, counts, 45), counts);
    const barColor = genderColor(gender, 0.75);
    const kdeColor = genderColor(gender);

    replaceChart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    type: "bar",
                    label: "Anzahl",
                    data: counts,
                    backgroundColor: barColor,
                    borderWidth: 0
                },
                {
                    type: "line",
                    label: "KDE",
                    data: scaled,
                    borderColor: kdeColor,
                    borderWidth: 3,
                    tension: 0.25,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Zielzeit (hh:mm)"
                    },
                   ticks: {
                       minRotation: 45,
                       maxRotation: 90
                   }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Teilnehmer"
                    }
                }
            }
        }
    });
}

/* -------------------------------------------------------
   MAIN EXPORT
------------------------------------------------------- */
export async function renderRaceHistogram(raceName, gender, target) {
    const canvas = resolveElement(target);
    if (!canvas) return;
    const race = await loadRaceStats(raceName);
    const buckets = race[gender]?.histogram?.buckets;
    if (!buckets) throw new Error("Missing histogram for " + gender);
    renderOneHistogram(canvas, buckets, gender);
}

// Compatibility for the experimental page's existing imports.
export async function renderRaceHistograms(raceName) {
    await Promise.all([
        renderRaceHistogram(raceName, "M", "histM"),
        renderRaceHistogram(raceName, "W", "histW")
    ]);
}

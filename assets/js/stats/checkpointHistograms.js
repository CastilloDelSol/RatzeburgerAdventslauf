import { loadCheckpointData } from "./dataLoader.js";
import { computeKDE, scaleKDE } from "./kde.js";
import { replaceChart, resolveElement } from "./chartLifecycle.js";
import { raceColor } from "./chartTheme.js";
import { formatCheckpointTime } from "./format.js";

const checkpoints = {
    start_histogram_buckets: { tickStep: 15, showSeconds: true, title: "Uhrzeit (hh:mm:ss)" },
    split_rothenhusen_histogram_buckets: { tickStep: 1, showSeconds: false, range: true, kde: true, title: "Uhrzeit (hh:mm)" },
    registration_histogram_buckets: { tickStep: 1, showSeconds: true, title: "Uhrzeit (hh:mm:ss)" },
    finish_histogram_buckets: { tickStep: 15, showSeconds: true, sparseGrid: true, title: "Zeit (hh:mm:ss)" }
};

// Include races first appearing in later buckets, and handle empty histograms.
export function buildRaceSeries(buckets, races = []) {
    const names = new Map(races.map(race => [race.race_id, race.name]));
    const ids = new Set(buckets.flatMap(bucket => bucket.athlete_counts.map(entry => entry.race_id)));
    return [...ids].map(raceId => {
        const counts = buckets.map(bucket => bucket.athlete_counts.find(entry => entry.race_id === raceId)?.count ?? 0);
        return { counts, label: names.get(raceId) || `Race ${raceId}` };
    }).filter(series => series.counts.some(count => count > 0));
}

export async function renderCheckpointHistogram(target, field, displayKde = null) {
    const canvas = resolveElement(target);
    if (!canvas) return;
    if (!Object.hasOwn(checkpoints, field)) throw new Error("Unknown checkpoint: " + field);
    const cfg = checkpoints[field];
    const data = await loadCheckpointData();
    const buckets = data[field];
    if (!buckets) throw new Error("Missing checkpoint buckets: " + field);
    const time = value => formatCheckpointTime(value, {
        showSeconds: cfg.showSeconds, timeZone: data.metadata?.timezone || "Europe/Berlin"
    });
    const labels = buckets.map(bucket => cfg.range
        ? `${time(bucket.range_start)}–${time(bucket.range_end)}` : time(bucket.range_start));
    const series = buildRaceSeries(buckets, data.metadata?.races);
    const datasets = series.map((race, index) => ({
        type: "bar", label: race.label, data: race.counts,
        backgroundColor: raceColor(index), stack: "stack1"
    }));
    if (displayKde ?? cfg.kde) {
        const xs = buckets.map(bucket => (bucket.range_start + bucket.range_end) / 2);
        const totals = buckets.map((_, index) => series.reduce((sum, race) => sum + race.counts[index], 0));
        datasets.push({
            type: "line", label: "KDE", data: scaleKDE(computeKDE(xs, totals, 45), totals),
            borderColor: raceColor(0, 1), borderWidth: 3, tension: 0.25, pointRadius: 0
        });
    }
    replaceChart(canvas, {
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: { display: true, text: cfg.title },
                    ticks: {
                        autoSkip: false,
                        callback: (value, index) => index % cfg.tickStep === 0 ? labels[index] : "",
                        minRotation: 45, maxRotation: 90
                    },
                    ...(cfg.sparseGrid ? { grid: {
                        color: context => context.tick && context.tick.value % cfg.tickStep === 0 ? undefined : "transparent",
                        lineWidth: context => context.tick && context.tick.value % cfg.tickStep === 0 ? undefined : 0
                    } } : {})
                },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: "Teilnehmer" } }
            }
        }
    });
}

export async function renderAllCheckpointHistograms() {
    await Promise.all(Object.entries({
        histStart: "start_histogram_buckets", histRothenhusen: "split_rothenhusen_histogram_buckets",
        histRegistration: "registration_histogram_buckets", histFinish: "finish_histogram_buckets"
    }).map(([id, field]) => renderCheckpointHistogram(id, field)));
}

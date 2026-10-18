// startHistogram.js
import { loadCheckpointData, getCheckpointData } from "./dataLoader.js";

// format seconds-from-midnight → HH:MM:SS
function secToClock(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const pad = x => x.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export async function renderStartHistogram(canvasId) {
    await loadCheckpointData();
    const data = getCheckpointData();

    const buckets = data.start_histogram_buckets;
    if (!buckets) {
        console.error("start_histogram_buckets missing");
        return;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Labels for X-axis from seconds
    const labels = buckets.map(b => secToClock(b.range_start));

    /* ----------------------------------------------
       Race metadata: build map race_id → race.name
    ---------------------------------------------- */
    const raceMetaMap = new Map();
    if (data.metadata?.races) {
        data.metadata.races.forEach(r =>
            raceMetaMap.set(r.race_id, r.name)
        );
    }

    /* ----------------------------------------------
       Extract race series
    ---------------------------------------------- */
    const raceIds = buckets[0].athlete_counts.map(a => a.race_id);

    let raceSeries = raceIds.map(raceId => {
        const counts = buckets.map(b => {
            const entry = b.athlete_counts.find(a => a.race_id === raceId);
            return entry ? entry.count : 0;
        });
        const sum = counts.reduce((a, b) => a + b, 0);
        return {
            raceId,
            counts,
            sum,
            label: raceMetaMap.get(raceId) || `Race ${raceId}`
        };
    }).filter(r => r.sum > 0);

    /* ----------------------------------------------
       Colors
    ---------------------------------------------- */
    const raceColors = [
        "rgba(54,162,235,0.75)",
        "rgba(255,159,64,0.75)",
        "rgba(153,102,255,0.75)",
        "rgba(255,205,86,0.75)",
        "rgba(75,192,192,0.75)"
    ];

    /* ----------------------------------------------
       Build datasets
    ---------------------------------------------- */
    const datasets = raceSeries.map((r, idx) => ({
        type: "bar",
        label: r.label,             // <-- real race name here
        data: r.counts,
        backgroundColor: raceColors[idx % raceColors.length],
        stack: "stack1"
    }));

    /* ----------------------------------------------
       Render chart
    ---------------------------------------------- */
    if (ctx._chart) ctx._chart.destroy();

    ctx._chart = new Chart(ctx, {
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: { display: true, text: "Uhrzeit (hh:mm:ss)" },
                    ticks: {
                        autoSkip: false,
                        callback: (value, index) => index % 15 === 0 ? labels[index] : "",
                        minRotation: 45,
                        maxRotation: 90
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: "Teilnehmer" }
                }
            }
        }
    });
}

// rothenhusenHistogram.js
import { loadCheckpointData, getCheckpointData } from "./dataLoader.js";
import { gaussianKernel, computeKDE } from "./kde.js";

// format seconds-from-midnight → HH:MM
function secToHM(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const pad = x => x.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}`;
}


export async function renderRothenhusenHistogram(canvasId) {
    await loadCheckpointData();
    const data = getCheckpointData();

    const buckets = data.split_rothenhusen_histogram_buckets;
    if (!buckets) {
        console.error("split_rothenhusen_histogram_buckets missing");
        return;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    /* --------------------------------------------------------
       Labels (seconds → HH:MM)
    -------------------------------------------------------- */
    const labels = buckets.map(b => `${secToHM(b.range_start)}–${secToHM(b.range_end)}`);


    /* --------------------------------------------------------
       Race metadata: race_id → name
    -------------------------------------------------------- */
    const raceMetaMap = new Map();
    if (data.metadata?.races) {
        data.metadata.races.forEach(r =>
            raceMetaMap.set(r.race_id, r.name)
        );
    }

    /* --------------------------------------------------------
       Extract race series
    -------------------------------------------------------- */
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

    /* --------------------------------------------------------
       Colors
    -------------------------------------------------------- */
    const raceColors = [
        "rgba(54,162,235,0.75)",
        "rgba(255,159,64,0.75)",
        "rgba(153,102,255,0.75)",
        "rgba(255,205,86,0.75)",
        "rgba(75,192,192,0.75)"
    ];

    const raceColorsSolid = raceColors.map(c => c.replace("0.75", "1.0"));

    /* --------------------------------------------------------
       Build bar datasets
    -------------------------------------------------------- */
    const datasets = raceSeries.map((r, idx) => ({
        type: "bar",
        label: r.label,
        data: r.counts,
        backgroundColor: raceColors[idx % raceColors.length],
        stack: "stack1"
    }));

    /* --------------------------------------------------------
       KDE curve
    -------------------------------------------------------- */

    // x positions = bucket midpoints
    const xs = buckets.map(b => (b.range_start + b.range_end) / 2);

    // total across all races
    const totalCounts = buckets.map((b, i) =>
        raceSeries.reduce((sum, r) => sum + r.counts[i], 0)
    );

    // KDE bandwidth for Rothenhusen (your config): 45
    const bandwidth = 45;

    const kdeValues = computeKDE(xs, totalCounts, bandwidth);

    // scale KDE to bar height
    const maxBar = Math.max(...totalCounts);
    const maxKde = Math.max(...kdeValues) || 1;
    const scaledKDE = kdeValues.map(v => v * maxBar / maxKde);

    datasets.push({
        type: "line",
        label: "KDE",
        data: scaledKDE,
        borderColor: raceColorsSolid[0],
        borderWidth: 3,
        tension: 0.25,
        pointRadius: 0
    });

    /* --------------------------------------------------------
       Render chart
    -------------------------------------------------------- */
    if (ctx._chart) ctx._chart.destroy();

    ctx._chart = new Chart(ctx, {
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: { display: true, text: "Uhrzeit (hh:mm)" },
                    ticks: {
                        autoSkip: false,
                        callback: (value, index) =>
                            index % 1 === 0 ? labels[index] : "" // Rothenhusen tickStep = 1
                    },
                   ticks: {
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

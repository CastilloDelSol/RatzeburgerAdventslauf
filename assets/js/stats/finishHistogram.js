// finishHistogram.js
import { loadCheckpointData, getCheckpointData } from "./dataLoader.js";

// format seconds-from-midnight → HH:MM:SS
function secToClock(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const pad = x => x.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export async function renderFinishHistogram(canvasId) {
    await loadCheckpointData();
    const data = getCheckpointData();

    const buckets = data.finish_histogram_buckets;
    if (!buckets) {
        console.error("finish_histogram_buckets missing");
        return;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    /* ----------------------------------------------------------
       Labels from seconds → HH:MM:SS
       If you prefer HH:MM–HH:MM, tell me.
    ---------------------------------------------------------- */
    const labels = buckets.map(b => secToClock(b.range_start));

    /* ----------------------------------------------------------
       Map race_id → race name
    ---------------------------------------------------------- */
    const raceMetaMap = new Map();
    if (data.metadata?.races) {
        data.metadata.races.forEach(r =>
            raceMetaMap.set(r.race_id, r.name)
        );
    }

    /* ----------------------------------------------------------
       Build race series
    ---------------------------------------------------------- */
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

    /* ----------------------------------------------------------
       Colors
    ---------------------------------------------------------- */
    const raceColors = [
        "rgba(54,162,235,0.75)",
        "rgba(255,159,64,0.75)",
        "rgba(153,102,255,0.75)",
        "rgba(255,205,86,0.75)",
        "rgba(75,192,192,0.75)"
    ];

    /* ----------------------------------------------------------
       Build bar datasets
    ---------------------------------------------------------- */
    const datasets = raceSeries.map((r, idx) => ({
        type: "bar",
        label: r.label,
        data: r.counts,
        backgroundColor: raceColors[idx % raceColors.length],
        stack: "stack1"
    }));

    /* ----------------------------------------------------------
       Render chart
    ---------------------------------------------------------- */
    if (ctx._chart) ctx._chart.destroy();

    ctx._chart = new Chart(ctx, {
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: { display: true, text: "Zeit (hh:mm:ss)" },

                    // Finish config: tick every 6 buckets
                    ticks: {
                        autoSkip: false,
                        callback: (value, index) =>
                            index % 15 === 0 ? labels[index] : ""
                    },

                    // Only show grid at those ticks
                    grid: {
                        drawOnChartArea: true,
                        color: (context) => {
                            const tick = context.tick;   // <-- this is where the index really is
                    
                            // If tick is undefined (Chart.js internal calls), draw nothing
                            if (!tick) return "rgba(0,0,0,0)";
                    
                            return tick.value % 15 === 0
                                ? undefined              // ← default Chart.js grid color
                                : "rgba(0,0,0,0)";       // ← hide all others
                        },
                        lineWidth: (context) => {
                            const tick = context.tick;
                            if (!tick) return 0;
                    
                            return tick.value % 15 === 0
                                ? undefined              // ← default width
                                : 0;                     // ← hide
                        }
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

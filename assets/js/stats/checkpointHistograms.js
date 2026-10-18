// checkpointHistograms.js
import { gaussianKernel, computeKDE } from "./kde.js";
import { loadCheckpointData, getCheckpointData } from "./dataLoader.js";

/* -------------------------------------------------------
   Time formatters
------------------------------------------------------- */
function secToHM(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
}

function isUnixTimestamp(val) {
    return val > 86400;
}

function formatBucketLabel(start, end) {
    if (isUnixTimestamp(start)) {
        const s = new Date(start * 1000);
        const e = new Date(end * 1000);
        const pad = x => x.toString().padStart(2, "0");
        return `${pad(s.getHours())}:${pad(s.getMinutes())}–${pad(e.getHours())}:${pad(e.getMinutes())}`;
    }
    return `${secToHM(start)}–${secToHM(end)}`;
}

/* -------------------------------------------------------
   PER-CHECKPOINT CONFIG
------------------------------------------------------- */
const CHECKPOINT_CONFIG = {
    start_histogram_buckets: {
        label: "Start",
        tickStep: 10,
        timeFormat: "clock",
        showRange: false,
        kde: false,
        bandwidth: 45
    },
    split_rothenhusen_histogram_buckets: {
        label: "Rothenhusen",
        tickStep: 1,
        timeFormat: "clock",
        showRange: false,
        kde: true,
        bandwidth: 45
    },
    registration_histogram_buckets: {
        label: "Anmeldung",
        tickStep: 1,
        timeFormat: "clock",
        showRange: false,
        kde: false,
        bandwidth: 60
    },
    finish_histogram_buckets: {
        label: "Ziel",
        tickStep: 6,
        timeFormat: "clock",
        showRange: false,
        kde: false,
        bandwidth: 30
    }
};


/* -------------------------------------------------------
   RENDER stacked histogram for ALL races (filtered)
------------------------------------------------------- */
export async function renderCheckpointHistogram(
    canvasId,
    checkpointField,
    displayKde = null          // overrides config if not null
) {
    await loadCheckpointData();
    const data = getCheckpointData();

    const buckets = data[checkpointField];
    if (!buckets) {
        console.error("Unknown checkpoint", checkpointField);
        return;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Specific config for this checkpoint
    const cfg = CHECKPOINT_CONFIG[checkpointField];

    /* -------------------------------------------
       TIME FORMATTER
    ------------------------------------------- */
    function unixToClock(u) {
        const d = new Date(u * 1000);
        const pad = x => x.toString().padStart(2, "0");
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // Only start time
    const labels = buckets.map(b => unixToClock(b.range_start));

    /* -------------------------------------------
       RACE FILTERING
    ------------------------------------------- */
    const raceIds = buckets[0].athlete_counts.map(a => a.race_id);

    let raceSeries = raceIds.map(ri => {
        const counts = buckets.map(b => {
            const entry = b.athlete_counts.find(a => a.race_id === ri);
            return entry ? entry.count : 0;
        });
        const sum = counts.reduce((a, b) => a + b, 0);
        return { race_id: ri, counts, sum };
    });

    // Filter out empty races
    raceSeries = raceSeries.filter(r => r.sum > 0);

    /* -------------------------------------------
       COLORS
    ------------------------------------------- */
    const raceColors = [
        "rgba(54,162,235,0.75)",
        "rgba(255,159,64,0.75)",
        "rgba(153,102,255,0.75)",
        "rgba(255,205,86,0.75)",
        "rgba(75,192,192,0.75)"
    ];
    const raceColorsSolid = raceColors.map(c =>
        c.replace("0.75", "1.0")
    );

    /* -------------------------------------------
       KDE positions (midpoint of buckets)
    ------------------------------------------- */
    const xs = buckets.map(
        b => (b.range_start + b.range_end) / 2
    );

    /* -------------------------------------------
       BAR DATASETS
    ------------------------------------------- */
    const datasets = [];

    raceSeries.forEach((r, idx) => {
        datasets.push({
            type: "bar",
            label: `Race ${r.race_id}`,
            data: r.counts,
            backgroundColor: raceColors[idx % raceColors.length],
            stack: "stack1"
        });
    });

    /* -------------------------------------------
       KDE (config or override)
    ------------------------------------------- */
    const useKde = displayKde !== null ? displayKde : cfg.kde;

    if (useKde) {
        const totalCounts = buckets.map((b, i) =>
            raceSeries.reduce((sum, r) => sum + r.counts[i], 0)
        );

        const kdeValues = computeKDE(xs, totalCounts, cfg.bandwidth);
        const maxBar = Math.max(...totalCounts);
        const maxKde = Math.max(...kdeValues) || 1;

        const scaled = kdeValues.map(v => v * maxBar / maxKde);

        datasets.push({
            type: "line",
            label: "KDE",
            data: scaled,
            borderColor: raceColorsSolid[0],
            borderWidth: 3,
            tension: 0.25,
            pointRadius: 0
        });
    }

    /* -------------------------------------------
       DRAW CHART
    ------------------------------------------- */
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
                    ticks: {
                        autoSkip: false,
                        callback: (value, index) =>
                            index % cfg.tickStep === 0 ? labels[index] : ""
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

/* -------------------------------------------------------
   Render all checkpoints (stacked) with fixed IDs
------------------------------------------------------- */
export async function renderAllCheckpointHistograms() {
    await loadCheckpointData();

    const mapping = {
        "histStart": "start_histogram_buckets",
        "histRothenhusen": "split_rothenhusen_histogram_buckets",
        "histRegistration": "registration_histogram_buckets",
        "histFinish": "finish_histogram_buckets"
    };

    for (const [canvasId, bucketField] of Object.entries(mapping)) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            renderCheckpointHistogram(canvasId, bucketField);
        }
    }
}

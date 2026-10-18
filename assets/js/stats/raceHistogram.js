// raceHistogram.js
import { loadRaceStats, getRaceStats } from "./raceStatsLoader.js";

/* -------------------------------------------------------
   Gaussian KDE
------------------------------------------------------- */
function gaussianKernel(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function computeKDE(buckets, bandwidth = 45) {
    const xs = buckets.map(b => (b.range_start + b.range_end) / 2);
    const counts = buckets.map(b => b.count);

    const kdeValues = xs.map(x0 => {
        let sum = 0;
        for (let i = 0; i < xs.length; i++) {
            const u = (x0 - xs[i]) / bandwidth;
            sum += counts[i] * gaussianKernel(u);
        }
        return sum;
    });

    return { xs, kdeValues };
}

/* -------------------------------------------------------
   Time formatter
------------------------------------------------------- */
function secToHM(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
}

/* -------------------------------------------------------
   Render ONE histogram
------------------------------------------------------- */
function renderOneHistogram(canvasId, buckets, gender) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Labels "1:10–1:20"
    const labels = buckets.map(b => {
        return `${secToHM(b.range_start)}–${secToHM(b.range_end)}`;
    });

    const counts = buckets.map(b => b.count);

    // KDE smoothing
    const { kdeValues } = computeKDE(buckets, 45);

    // Scale KDE visually to bar height
    const maxCount = Math.max(...counts);
    const maxKde = Math.max(...kdeValues);
    const scaled = kdeValues.map(v => v * maxCount / maxKde);

    // Choose bar color based on gender
    const barColor =
        gender === "M"
            ? "rgba(54,162,235,0.75)"
            : "rgba(255,99,132,0.75)";

    // KDE color (dark blue tint)
   const kdeColor =
       gender === "M"
           ? "rgba(54,162,235,1.0)"     // strong blue
           : "rgba(255,99,132,1.0)";     // strong magenta
   

    // Destroy old chart
    if (ctx._chart) ctx._chart.destroy();

    ctx._chart = new Chart(ctx, {
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
export async function renderRaceHistograms(raceName) {
    await loadRaceStats(raceName);
    const race = getRaceStats(raceName);

    if (!race) return;

    if (race.M?.histogram?.buckets)
        renderOneHistogram("histM", race.M.histogram.buckets, "M");

    if (race.W?.histogram?.buckets)
        renderOneHistogram("histW", race.W.histogram.buckets, "W");
}

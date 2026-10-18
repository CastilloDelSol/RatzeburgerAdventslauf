import { loadRaceStats } from "./raceStatsLoader.js";
import { replaceChart, resolveElement } from "./chartLifecycle.js";
import { genderColor } from "./chartTheme.js";
import { formatTime } from "./format.js";

function sortAgeGroups(statsObj) {
    const keys = Object.keys(statsObj);

    return keys.sort((a, b) => {
        const isAoverall = a === "Overall";
        const isBoverall = b === "Overall";
        if (isAoverall && !isBoverall) return -1;
        if (!isAoverall && isBoverall) return 1;

        const isAju = a.startsWith("JU");
        const isBju = b.startsWith("JU");
        if (isAju && !isBju) return -1;
        if (!isAju && isBju) return 1;
        if (isAju && isBju) return parseInt(a.slice(2)) - parseInt(b.slice(2));

        const na = parseInt(a);
        const nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;

        return a.localeCompare(b);
    });
}

// ------------------------------------------------------------
// Render one bar chart (M or W)
// ------------------------------------------------------------
function renderOne(canvasId, stats, dataKey, gender) {
    const ctx = resolveElement(canvasId);
    if (!ctx) return;


    const groups = sortAgeGroups(stats);

    const labels = [];
    const values = [];

    groups.forEach(ag => {
        const row = stats[ag];
        const sec = row[dataKey]?.sec ?? null;
        if (sec !== null) {
            labels.push(ag);
            values.push(sec);
        }
    });

    const yMin = 0;
    const barColor = genderColor(gender, 0.75);
    const borderColor = genderColor(gender);

    replaceChart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: dataKey,
                data: values,
                backgroundColor: barColor,
                borderColor: borderColor,
                borderWidth: 2
            }]
        },

        options: {
            maintainAspectRatio: false,
            responsive: true,

            scales: {
                x: {
                    title: { display: true, text: "Altersklasse" },
                    ticks: { maxRotation: 90, minRotation: 45 }
                },
                y: {
                    beginAtZero: true,
                    min: yMin,
                    title: { display: true, text: "Zielzeit (hh:mm:ss)" },
                    ticks: {
                        callback: value => formatTime(value)
                    }
                }
            },

            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatTime(ctx.raw)
                    }
                },
                legend: { display: false }
            }
        }
    });

}

// ------------------------------------------------------------
// Main export
// ------------------------------------------------------------
export async function renderAKChart(raceName, gender, typeKey, target) {
    const canvas = resolveElement(target);
    if (!canvas) return;
    const race = await loadRaceStats(raceName);
    if (!race[gender]?.statistics) throw new Error("Missing age-group statistics for " + gender);
    renderOne(canvas, race[gender].statistics, typeKey, gender);
}

export async function renderAKCharts(raceName, typeKey) {
    await Promise.all([
        renderAKChart(raceName, "M", typeKey, "akBarsM"),
        renderAKChart(raceName, "W", typeKey, "akBarsW")
    ]);
}

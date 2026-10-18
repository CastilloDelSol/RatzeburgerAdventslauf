// deficitLineChart.js

import { loadRaceStats } from "./raceStatsLoader.js";
import { replaceChart, destroyChart, resolveElement } from "./chartLifecycle.js";
import { formatNumber } from "./format.js";

// --------------------------------------------------------------
// Short display name: "S. Müller"
// --------------------------------------------------------------
function shortName(r) {
    const fn = r.first_name?.trim() ?? "";
    const ln = r.last_name?.trim() ?? "";
    const init = fn.length > 0 ? fn[0].toUpperCase() + "." : "";
    return `${init} ${ln}`;
}

// --------------------------------------------------------------
// MAIN EXPORT
// --------------------------------------------------------------
export async function renderDeficitChart(raceName, gender, target, numResults = 6) {
    const canvas = resolveElement(target);
    if (!canvas) return;
    const race = await loadRaceStats(raceName);
    if (!race.splits || !race[gender]?.Top10) throw new Error("Missing split results for " + gender);
    renderOne(canvas, race[gender].Top10.slice(0, numResults), race.splits);
}

export async function renderDeficitCharts(raceName, numResults = 6) {
    await Promise.all([
        renderDeficitChart(raceName, "M", "deficitChartM", numResults),
        renderDeficitChart(raceName, "W", "deficitChartW", numResults)
    ]);
}

// --------------------------------------------------------------
// RENDER ONE CHART
// --------------------------------------------------------------
function renderOne(target, runners, splits) {

    const canvas = resolveElement(target);
    if (!canvas) return;

    if (!runners || runners.length === 0) {
        destroyChart(canvas);
        return;
    }

    // X–axis km including start
    const kmPoints = [0, ...splits.map(s => s.distance_km)];

    // Absolute times for each athlete
    const absTimes = runners.map(r => {
        const arr = [0];
        r.splits.forEach(s => arr.push(s.sec));
        return arr;
    });

    // Best times per split (lowest)
    const bestTimes = kmPoints.map((_, i) =>
        Math.min(...absTimes.map(row => row[i]))
    );

    // Build datasets
    const datasets = runners.map((r, idx) => ({
        label: shortName(r),
        data: kmPoints.map((km, i) => ({
            x: km,
            y: bestTimes[i] - absTimes[idx][i]
        })),
        borderWidth: 3,
        tension: 0.28,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6
    }));

    // --------------------------------------------------------------
    // NEW CHART
    // --------------------------------------------------------------
    replaceChart(canvas, {
        type: "line",
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Distanz (km)" },

                    afterBuildTicks: axis => {
                        axis.ticks = kmPoints.map(v => ({ value: v }));
                    },

                    ticks: {
                        callback: v => formatNumber(v, 1)
                    },

                    min: 0,
                    max: kmPoints[kmPoints.length - 1]
                },

                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Defizit (Sekunden)" }
                }
            },

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "rect",
                        padding: 14,
                        textAlign: "left",
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: ctx => {
                            const p = ctx[0].raw;
                            const s = splits.find(s => s.distance_km === p.x);
                            return s ? `${s.name} (${p.x} km)` : `${p.x} km`;
                        },
                        label: ctx =>
                            `${ctx.dataset.label}: ${formatNumber(ctx.raw.y, 1)} s`
                    }
                }
            }
        }
    });
}

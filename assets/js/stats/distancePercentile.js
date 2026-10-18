import { replaceChart, resolveElement } from "./chartLifecycle.js";
import { genderColor } from "./chartTheme.js";
import { formatNumber } from "./format.js";

// distancePercentile.js

import { loadGeoData } from "./dataLoader.js";

export async function renderDistancePercentile(canvasId) {
    const canvas = resolveElement(canvasId);
    if (!canvas) return;
    const geo = await loadGeoData();

    if (!geo || !geo.percentiles_km) {
        throw new Error("No percentile data found");
    }

    // -------------------------------------------------------------
    // 1. Percentiles to arrays (sorted by percentile number)
    // -------------------------------------------------------------
    const entries = Object.entries(geo.percentiles_km)
        .map(([p, val]) => ({
            percentile: parseFloat(p.replace("%", "")),
            value: val
        }))
        .sort((a, b) => a.percentile - b.percentile);

    const labels = entries.map(e => e.percentile + "%");
    const values = entries.map(e => e.value);

    // -------------------------------------------------------------
    // 2. Create Chart.js Percentile Line Chart
    // -------------------------------------------------------------
    replaceChart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Entfernung (km)",
                data: values,
                borderColor: genderColor("M"),  // Pyramiden-Blau
                backgroundColor: genderColor("M", 0.2),
                borderWidth: 3,
                pointRadius: 0,
                tension: 0.33 // leicht geglättet
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Perzentil (%)"
                    },
                    ticks: {
                        maxTicksLimit: 11
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "Entfernung (km, log10)"
                    },
                    type: "logarithmic",
                    min: 0.1,
                    ticks: {
                        callback: (v) => {
                            return formatNumber(Number(v), Number.isInteger(Number(v)) ? 0 : 1) + " km";
                        }
                    }
                }
            },

            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => 
                            `Distanz: ${formatNumber(ctx.raw, 2)} km`
                    }
                }
            }
        }
    });
}

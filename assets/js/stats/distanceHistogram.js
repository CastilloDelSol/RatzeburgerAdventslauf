import { computeKDE, scaleKDE } from "./kde.js";
import { replaceChart, resolveElement } from "./chartLifecycle.js";
import { genderColor } from "./chartTheme.js";
import { formatNumber } from "./format.js";
// distanceHistogram.js

import { loadGeoData } from "./dataLoader.js";

// --------------------------------------------------------
// Render Smoothed Histogram + KDE Line
// --------------------------------------------------------
export async function renderDistanceHistogram(canvasId) {
    const canvas = resolveElement(canvasId);
    if (!canvas) return;
    const geo = await loadGeoData();

    if (!geo || !geo.distance_histogram) {
        throw new Error("No histogram data found");
    }

    // 1) BUCKET LIMIT: Only ≤200 km
    const buckets = geo.distance_histogram.filter(b => b.max <= 200);

    // 2) Labels
    const labels = buckets.map(b => `${b.min}–${b.max}`);

    // 3) Counts
    const counts = buckets.map(b => b.count);

    // 4) KDE smoothing
    const xs = buckets.map(b => (b.min + b.max) / 2);
    const scaledKde = scaleKDE(computeKDE(xs, counts, 8), counts);

    // --------------------------------------------------------
    // Create the chart
    // --------------------------------------------------------
    replaceChart(canvas, {
        data: {
            labels: labels,
            datasets: [
                // Histogram bars
                {
                    type: "bar",
                    label: "Anzahl",
                    data: counts,
                    backgroundColor: genderColor("M", 0.75),   // pyramid blue
                    borderWidth: 0
                },

                // KDE line
                {
                    type: "line",
                    label: "Geglättete Verteilung",
                    data: scaledKde,
                    borderColor: genderColor("W"),         // pyramid red
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.35,
                }
            ]
        },

        options: {
            maintainAspectRatio: false,
            responsive: true,

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Entfernung (km)"
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Teilnehmer"
                    }
                }
            },

            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            if (ctx.dataset.type === "bar") {
                                return `${formatNumber(ctx.raw)} Teilnehmer`;
                            } else {
                                return `Glättung: ${formatNumber(ctx.raw)}`;
                            }
                        }
                    }
                }
            }
        }
    });
}

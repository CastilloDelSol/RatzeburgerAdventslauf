// akBarChart.js

import { loadRaceStats, getRaceStats } from "./raceStatsLoader.js";

let chartM = null;
let chartW = null;

// ------------------------------------------------------------
// Format seconds → HH:MM:SS
// ------------------------------------------------------------
function secToHMS(sec) {
    if (sec == null) return "";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ------------------------------------------------------------
// Round a time upward to next full 30-minute block
// e.g. 1:18 → 1:30  /  2:01 → 2:30
// ------------------------------------------------------------
function roundUpToNext30min(sec) {
    const block = 30 * 60; // 1800 sec
    return Math.ceil(sec / block) * block;
}

// ------------------------------------------------------------
// Build a sorted AG list
// ------------------------------------------------------------
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
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    let chartRef = (gender === "M" ? chartM : chartW);
    if (chartRef) chartRef.destroy();

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

    // ------------------------------
    // Compute y-axis range
    // ------------------------------
    const maxSec = Math.max(...values);
    //const yMax = roundUpToNext30min(maxSec);
    const yMin = 0;

    const barColor = gender === "M"
        ? "rgba(54, 162, 235, 0.75)"
        : "rgba(255, 99, 132, 0.75)";

    const borderColor = gender === "M"
        ? "rgba(54, 162, 235, 1.0)"
        : "rgba(255, 99, 132, 1.0)";

    const newChart = new Chart(ctx, {
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
                    //max: yMax,
                    title: { display: true, text: "Zielzeit (hh:mm:ss)" },
                    ticks: {
                        callback: secToHMS
                    }
                }
            },

            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => secToHMS(ctx.raw)
                    }
                },
                legend: { display: false }
            }
        }
    });

    if (gender === "M") chartM = newChart;
    else chartW = newChart;
}

// ------------------------------------------------------------
// Main export
// ------------------------------------------------------------
export async function renderAKCharts(raceName, typeKey) {

    await loadRaceStats(raceName);
    const race = getRaceStats(raceName);

    if (!race || !race.M || !race.W) {
        console.error("Missing race stats:", raceName);
        return;
    }

    renderOne("akBarsM", race.M.statistics, typeKey, "M");
    renderOne("akBarsW", race.W.statistics, typeKey, "W");
}

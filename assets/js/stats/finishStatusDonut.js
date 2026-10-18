// finishStatusDonut.js
import { loadRaceStats, getRaceStats } from "./raceStatsLoader.js";

// exakt gleiches Plugin-Muster wie beim Gender-Donut,
// nur mit zweizeiligem Text (Zahl + "Finisher")
const centerText = {
    id: "centerText",
    beforeDraw(chart, args, options) {
        const ctx = chart.ctx;
        const { top, bottom, left, right } = chart.chartArea;

        ctx.save();
        ctx.font = "bold 26px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const x = (left + right) / 2;
        const y = (top + bottom) / 2;

        // Zeile 1: Zahl
        ctx.fillText(options.value, x, y);
        // Zeile 2: "Finisher"
        ctx.font = "normal 14px Arial";
        ctx.fillText("Finisher", x, y + 20);

        ctx.restore();
    }
};

export async function renderFinishStatusDonut(raceName, canvasId) {
    await loadRaceStats(raceName);
    const race = getRaceStats(raceName);
    if (!race) return;

    const fin = race.finisher ?? 0;
    const dns = race.dns ?? 0;
    const dnf = race.dnf ?? 0;
    const dsq = race.dsq ?? 0;

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    new Chart(canvas, {
        type: "doughnut",
        plugins: [centerText],

        data: {
            labels: ["FIN", "DNS", "DNF", "DSQ"],
            datasets: [{
                data: [fin, dns, dnf, dsq],
                backgroundColor: [
                    "#52C47A", // FIN – grün
                    "#EFA93F", // DNS – orange
                    "#D9574A", // DNF – rot
                    "#9063CD"  // DSQ – violett
                ]
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
        
            plugins: {
                centerText: { value: fin },
        
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const data = context.dataset.data;
                            const total = data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        
                            return `${context.label}: ${value} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

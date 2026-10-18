// donutGender.js

import { loadAgeData } from "./dataLoader.js";

const centerText = {
    id: "centerText",
    beforeDraw(chart, args, options)
    {
        const ctx = chart.ctx;
        const { top, bottom, left, right } = chart.chartArea;

        ctx.save();
        ctx.font = "bold 28px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const x = (left + right) / 2;
        const y = (top + bottom) / 2;

        ctx.fillText(options.value, x, y);
        ctx.restore();
    }
};

export async function renderGenderDonut(sectionName, canvasId)
{
    const data = await loadAgeData();

    let totalM = 0, totalW = 0;

    if (sectionName === "TOTAL")
    {
        for (const key of Object.keys(data))
        {
            data[key].forEach(e => { totalM += e.M; totalW += e.W; });
        }
    }
    else
    {
        const group = data[sectionName];
        if (!group) return console.error("Section not found:", sectionName);
        group.forEach(e => { totalM += e.M; totalW += e.W; });
    }

    const canvas = document.getElementById(canvasId);

    new Chart(canvas,{
        type: "doughnut",
        plugins: [centerText],
        data:
        {
            labels: ["M", "W"],
            datasets: [{ data: [totalM, totalW], backgroundColor: ["#4EA5E9", "#FF6384"]}]
        },
        options:
        {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
        
            plugins: {
                centerText: { value: totalM + totalW },
        
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;                 // M oder W Wert
                            const data = context.dataset.data;         // [totalM, totalW]
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

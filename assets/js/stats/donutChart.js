import { replaceChart } from "./chartLifecycle.js";
import { formatNumber, formatPercent } from "./format.js";

const centerText = {
    id: "centerText",
    beforeDraw(chart, args, options) {
        if (!chart.chartArea) return;
        const { top, bottom, left, right } = chart.chartArea;
        const x = (left + right) / 2;
        const y = (top + bottom) / 2;
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = `bold ${options.caption ? 26 : 28}px Arial`;
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(formatNumber(options.value), x, y);
        if (options.caption) {
            ctx.font = "normal 14px Arial";
            ctx.fillText(options.caption, x, y + 20);
        }
        ctx.restore();
    }
};

export function renderDonut(target, { labels, values, colors, value, caption = "" }) {
    return replaceChart(target, {
        type: "doughnut",
        plugins: [centerText],
        data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
                centerText: { value, caption },
                tooltip: {
                    callbacks: {
                        label: context => {
                            const total = context.dataset.data.reduce((sum, count) => sum + count, 0);
                            return `${context.label}: ${formatNumber(context.raw)} (${formatPercent(context.raw, total)})`;
                        }
                    }
                }
            }
        }
    });
}

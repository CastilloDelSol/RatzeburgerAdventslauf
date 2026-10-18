// agePyramid.js

import { loadAgeData, getSection } from "./dataLoader.js";

export async function renderAgePyramid(sectionName, canvasId, containerId) {
  await loadAgeData();

  const group = getSection(sectionName);
  if (!group) return console.error("Section not found:", sectionName);

  const rows = group.length;
  const rowHeight = 18;
  const topBottomPadding = 90;
  const barThicknessPixel = 18;

  const box = document.getElementById(containerId);
  box.style.height = (rows * rowHeight + topBottomPadding) + "px";

  const agegroups = group.map(e => e.AG).reverse();
  const males     = group.map(e => -e.M).reverse();
  const females   = group.map(e =>  e.W).reverse();

  let maxValue = Math.max(...males.map(v => Math.abs(v)), ...females);
  maxValue = Math.ceil(maxValue / 10) * 10;

  new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: {
      labels: agegroups,
      datasets: [
        {
          label: "M",
          data: males,
          backgroundColor: "rgba(54, 162, 235, 1.0)",
          stack: "same",
          barThickness: barThicknessPixel
        },
        {
          label: "W",
          data: females,
          backgroundColor: "rgba(255, 99, 132, 1.0)",
          stack: "same",
          barThickness: barThicknessPixel
        }
      ]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      scales: {
        x: {
          min: -maxValue,
          max:  maxValue,
          ticks: { callback: v => Math.abs(v) }
        },
        y: {
          type: 'category',
          offset: true,
          reverse: false
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: () => "",
            label: ctx => `${ctx.dataset.label}${ctx.label}: ${Math.abs(ctx.raw)}`
          }
        }
      }
    }
  });
}

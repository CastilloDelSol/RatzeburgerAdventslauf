// agePyramid.js

import { replaceChart, resolveElement } from "./chartLifecycle.js";
import { genderColor } from "./chartTheme.js";
import { formatNumber } from "./format.js";

import { loadAgeData, getSection } from "./dataLoader.js";

export async function renderAgePyramid(sectionName, canvasId, containerId) {
  const canvas = resolveElement(canvasId);
  const box = containerId ? resolveElement(containerId) : canvas?.parentElement;
  if (!canvas || !box) return;
  await loadAgeData();

  const group = getSection(sectionName);
  if (!group) throw new Error("Section not found: " + sectionName);

  const rows = group.length;
  const rowHeight = 18;
  const topBottomPadding = 90;
  const barThicknessPixel = 18;

  box.style.height = (rows * rowHeight + topBottomPadding) + "px";

  const agegroups = group.map(e => e.AG).reverse();
  const males     = group.map(e => -e.M).reverse();
  const females   = group.map(e =>  e.W).reverse();

  let maxValue = Math.max(0, ...males.map(v => Math.abs(v)), ...females);
  maxValue = Math.max(10, Math.ceil(maxValue / 10) * 10);

  replaceChart(canvas, {
    type: "bar",
    data: {
      labels: agegroups,
      datasets: [
        {
          label: "M",
          data: males,
          backgroundColor: genderColor("M"),
          stack: "same",
          barThickness: barThicknessPixel
        },
        {
          label: "W",
          data: females,
          backgroundColor: genderColor("W"),
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
          ticks: { callback: v => formatNumber(Math.abs(v)) }
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
            label: ctx => `${ctx.dataset.label}${ctx.label}: ${formatNumber(Math.abs(ctx.raw))}`
          }
        }
      }
    }
  });
}

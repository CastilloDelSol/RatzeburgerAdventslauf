import { loadAgeData } from "./dataLoader.js";
import { resolveElement } from "./chartLifecycle.js";
import { renderDonut } from "./donutChart.js";
import { genderColor } from "./chartTheme.js";

export async function renderGenderDonut(sectionName, target) {
    const canvas = resolveElement(target);
    if (!canvas) return;
    const data = await loadAgeData();
    const groups = sectionName === "TOTAL" ? Object.values(data) : [data[sectionName]];
    if (groups.some(group => !group)) throw new Error("Section not found: " + sectionName);
    let totalM = 0, totalW = 0;
    for (const group of groups) {
        for (const entry of group) { totalM += entry.M; totalW += entry.W; }
    }
    renderDonut(canvas, {
        labels: ["M", "W"], values: [totalM, totalW],
        colors: [genderColor("M"), genderColor("W")], value: totalM + totalW
    });
}

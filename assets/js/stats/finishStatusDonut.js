import { loadRaceStats } from "./raceStatsLoader.js";
import { resolveElement } from "./chartLifecycle.js";
import { renderDonut } from "./donutChart.js";
import { finishStatusColors } from "./chartTheme.js";

export async function renderFinishStatusDonut(raceName, target) {
    const canvas = resolveElement(target);
    if (!canvas) return;
    const race = await loadRaceStats(raceName);
    renderDonut(canvas, {
        labels: ["FIN", "DNS", "DNF", "DSQ"],
        values: [race.finisher ?? 0, race.dns ?? 0, race.dnf ?? 0, race.dsq ?? 0],
        colors: finishStatusColors, value: race.finisher ?? 0, caption: "Finisher"
    });
}

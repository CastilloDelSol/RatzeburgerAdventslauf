import "./privacy.js";
import { renderGenderDonut } from "./stats/genderDonut.js";
import { renderNationalityTable } from "./stats/nationalityTable.js";
import { renderFederalStateTable } from "./stats/federalStateTable.js";
import { renderAgePyramid } from "./stats/agePyramid.js";
import { loadGeoData } from "./stats/dataLoader.js";
import { renderDistancePercentile } from "./stats/distancePercentile.js";
import { renderDistanceHistogram } from "./stats/distanceHistogram.js";
import { renderFinishStatusDonut } from "./stats/finishStatusDonut.js";
import { renderTop6Table } from "./stats/top6Table.js";
import { renderDeficitChart } from "./stats/deficitLineChart.js";
import { renderRaceHistogram } from "./stats/raceHistogram.js";
import { renderAKChart } from "./stats/akBarChart.js";
import { renderCheckpointHistogram } from "./stats/checkpointHistograms.js";
import { formatNumber, formatDistance } from "./stats/format.js";

// A value can be fixed on the view or supplied by a dropdown in the year's HTML.
function selection(target, name) {
    const selectId = target.dataset[`${name}Select`];
    const value = selectId ? document.getElementById(selectId)?.value : target.dataset[name];
    if (!value) throw new Error(`Missing ${name} for ${target.id || target.dataset.chart || target.dataset.table}`);
    return value;
}

function gender(target) {
    const value = selection(target, "gender");
    if (value !== "M" && value !== "W") throw new Error("Unknown gender: " + value);
    return value;
}

function integer(target, name, fallback) {
    const value = Number(target.dataset[name] ?? fallback);
    if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${name}: ${value}`);
    return value;
}

const charts = {
    gender: target => renderGenderDonut(selection(target, "section"), target),
    "age-pyramid": target => renderAgePyramid(selection(target, "section"), target, target.dataset.container),
    "distance-percentile": renderDistancePercentile,
    "distance-histogram": renderDistanceHistogram,
    "finish-status": target => renderFinishStatusDonut(selection(target, "race"), target),
    deficit: target => renderDeficitChart(selection(target, "race"), gender(target), target, integer(target, "limit", 6)),
    "race-histogram": target => renderRaceHistogram(selection(target, "race"), gender(target), target),
    "age-groups": target => renderAKChart(selection(target, "race"), gender(target), selection(target, "metric"), target),
    checkpoint: target => renderCheckpointHistogram(target, selection(target, "checkpoint"))
};

const tables = {
    nationality: renderNationalityTable,
    "federal-states": renderFederalStateTable,
    top6: target => renderTop6Table(selection(target, "race"), gender(target), target, integer(target, "limit", 6))
};

async function renderView(target) {
    if (target.dataset.stat) {
        const data = await loadGeoData();
        const value = data[target.dataset.stat];
        if (!Number.isFinite(value)) throw new Error("Missing numeric statistic: " + target.dataset.stat);
        if (target.dataset.format === "distance") {
            target.textContent = formatDistance(value, integer(target, "digits", 1));
            return;
        }
        const unit = target.dataset.unit ? ` ${target.dataset.unit}` : "";
        target.textContent = formatNumber(value, integer(target, "digits", 0)) + unit;
        return;
    }
    const name = target.dataset.chart || target.dataset.table;
    const registry = target.dataset.chart ? charts : tables;
    if (!Object.hasOwn(registry, name)) throw new Error("Unknown statistic view: " + name);
    await registry[name](target);
}

// Commenting out a panel also disables its menu entry and selects a remaining tab.
const availableTabs = [];
document.querySelectorAll(".tab-buttons label[for]").forEach(label => {
    const input = document.getElementById(label.htmlFor);
    const panel = document.querySelector(`.content${label.htmlFor.replace("tab", "")}`);
    label.hidden = !input || !panel;
    if (input) input.disabled = !panel;
    if (input && panel) availableTabs.push(input);
});
if (availableTabs.length && !availableTabs.some(input => input.checked)) availableTabs[0].checked = true;

// Each declared view owns its loading, error and update state. Updates are
// serialized per element so a slow response cannot overwrite the last selection.
document.querySelectorAll("[data-chart], [data-table], [data-stat]").forEach(target => {
    const container = target.closest(
        ".card, .donut-box, .pyramid-chart-container, .geo-chart-container, .geo-kpi-box, .table-box"
    ) || target.parentElement;
    let running = false;
    let pending = false;
    let errorMessage;

    async function update() {
        pending = true;
        if (running) return;
        running = true;
        try {
            while (pending && target.isConnected) {
                pending = false;
                errorMessage?.remove();
                target.setAttribute("aria-busy", "true");
                try {
                    await renderView(target);
                } catch (error) {
                    console.error("Statistik konnte nicht geladen werden", target.dataset, error);
                    errorMessage = document.createElement("p");
                    errorMessage.className = "load-error";
                    errorMessage.setAttribute("role", "alert");
                    errorMessage.textContent = "Für diese Auswertung konnten die Daten nicht geladen werden.";
                    container.append(errorMessage);
                } finally {
                    target.setAttribute("aria-busy", "false");
                }
            }
        } finally {
            running = false;
        }
    }

    const controls = new Set([target.dataset.raceSelect, target.dataset.metricSelect, target.dataset.checkpointSelect]);
    for (const id of controls) {
        if (id) document.getElementById(id)?.addEventListener("change", update);
    }
    update();
});

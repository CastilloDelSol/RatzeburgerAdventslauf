import "./privacy.js";
import { renderGenderDonut } from "./stats/genderDonut.js";
import { renderNationalityTable } from "./stats/nationalityTable.js";
import { renderFederalStateTable } from "./stats/federalStateTable.js";
import { renderAgePyramid } from "./stats/agePyramid.js";
import { loadGeoData } from "./stats/dataLoader.js";
import { renderDistancePercentile } from "./stats/distancePercentile.js";
import { renderDistanceHistogram } from "./stats/distanceHistogram.js";
import { renderFinishStatusDonut } from "./stats/finishStatusDonut.js";
import { renderTop6Tables } from "./stats/top6Table.js";
import { renderDeficitCharts } from "./stats/deficitLineChart.js";
import { renderRaceHistograms } from "./stats/raceHistogram.js";
import { renderAKCharts } from "./stats/akBarChart.js";

const element = id => document.getElementById(id);

// Commenting out a panel also disables its menu entry. Select a remaining tab
// if the previously selected panel was removed from the year's HTML.
const availableTabs = [];
document.querySelectorAll(".tab-buttons label[for]").forEach(label => {
    const input = element(label.htmlFor);
    const panel = document.querySelector(`.content${label.htmlFor.replace("tab", "")}`);
    label.hidden = !input || !panel;
    if (input) input.disabled = !panel;
    if (input && panel) availableTabs.push(input);
});
if (availableTabs.length && !availableTabs.some(input => input.checked)) {
    availableTabs[0].checked = true;
}

// Check the HTML before calling any loader. Missing panels never fetch data.
async function renderIfPresent(ids, render) {
    const targets = ids.map(element).filter(Boolean);
    if (!targets.length) return;
    const containers = new Set(targets.map(target => target.closest(
        ".card, .donut-box, .pyramid-chart-container, .geo-chart-container, .geo-kpi-box, .table-box"
    ) || target.parentElement));
    for (const container of containers) {
        container.querySelectorAll(".load-error").forEach(message => message.remove());
    }
    try {
        await render();
    } catch (error) {
        console.error(`Statistik konnte nicht geladen werden (${ids.join(", ")})`, error);
        for (const container of containers) {
            if (container.querySelector(".load-error")) continue;
            const message = document.createElement("p");
            message.className = "load-error";
            message.setAttribute("role", "alert");
            message.textContent = "Für diese Auswertung konnten die Daten nicht geladen werden.";
            container.append(message);
        }
    }
}

for (const [section, canvas] of [
    ["TOTAL", "donutTotal"], ["Kurzstrecke", "donutKurz"],
    ["Hauptlauf", "donutHaupt"], ["Kinderlauf", "donutKinder"]
]) {
    renderIfPresent([canvas], () => renderGenderDonut(section, canvas));
}
renderIfPresent(["nationalityTable"], renderNationalityTable);
renderIfPresent(["federalStateTable"], renderFederalStateTable);

for (const [section, canvas, box] of [
    ["Kurzstrecke", "chartKurz", "boxKurz"],
    ["Hauptlauf", "chartHaupt", "boxHaupt"]
]) {
    if (element(box)) renderIfPresent([canvas], () => renderAgePyramid(section, canvas, box));
}

renderIfPresent(["geoMin", "geoAvg", "geoMedian", "geoMax"], async () => {
    const geo = await loadGeoData();
    for (const [id, key, digits] of [
        ["geoMin", "distance_min_km", 1], ["geoAvg", "distance_avg_km", 1],
        ["geoMedian", "distance_median_km", 1], ["geoMax", "distance_max_km", 0]
    ]) {
        if (element(id)) element(id).textContent = geo[key].toFixed(digits) + " km";
    }
});
renderIfPresent(["distancePercentile"], () => renderDistancePercentile("distancePercentile"));
renderIfPresent(["distanceHistogram"], () => renderDistanceHistogram("distanceHistogram"));
renderIfPresent(["donut26k"], () => renderFinishStatusDonut("hauptlauf", "donut26k"));
renderIfPresent(["donut7k5"], () => renderFinishStatusDonut("kurzstrecke", "donut7k5"));

function bindRaceSelect(id, targets, render) {
    const select = element(id);
    if (!select) return;
    const update = () => renderIfPresent(targets, () => render(select.value));
    select.addEventListener("change", update);
    update();
}

bindRaceSelect("top6Select", ["top6TableM", "top6TableW"], renderTop6Tables);
bindRaceSelect("top6Select", ["deficitChartM", "deficitChartW"], renderDeficitCharts);
bindRaceSelect("histSelect", ["histM", "histW"], renderRaceHistograms);

const akSelect = element("akSelect");
const resultDataType = element("resultDataType");
if (akSelect && resultDataType) {
    const update = () => renderIfPresent(["akBarsM", "akBarsW"], () =>
        renderAKCharts(akSelect.value, resultDataType.value));
    akSelect.addEventListener("change", update);
    resultDataType.addEventListener("change", update);
    update();
}

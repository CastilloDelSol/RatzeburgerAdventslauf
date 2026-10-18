// top6Table.js
import { loadRaceStats } from "./raceStatsLoader.js";
import { resolveElement } from "./chartLifecycle.js";
import { formatNumber } from "./format.js";

// ======================================================================
// RENDER TABLES (M/W)
// ======================================================================
export async function renderTop6Table(raceName, gender, target, limit = 6) {
    const box = resolveElement(target);
    if (!box) return;
    const race = await loadRaceStats(raceName);
    if (!race[gender]?.Top10 || !race.splits) throw new Error("Missing top results for " + gender);
    renderOne(box, race[gender].Top10.slice(0, limit), race.splits, gender);
}

export async function renderTop6Tables(raceName) {
    await Promise.all([
        renderTop6Table(raceName, "M", "top6TableM"),
        renderTop6Table(raceName, "W", "top6TableW")
    ]);
}

// ======================================================================
// INTERNAL RENDER FUNCTION
// ======================================================================
function renderOne(target, top6, splitMeta, genderPrefix) {
    const box = resolveElement(target);
    if (!box) return;

    if (!top6 || top6.length === 0) {
        box.innerHTML = "<p>Keine Daten verfügbar.</p>";
        return;
    }

    // Name uppercase + ß → ẞ
    const toUppercaseName = (str) =>
        str.replace(/ß/g, "ẞ").toUpperCase();

    // Only distances (e.g. "12.5km")
    const splitLabels = splitMeta.map(s => `${formatNumber(s.distance_km, Number.isInteger(s.distance_km) ? 0 : 1)}km`);

    const lastSplitIndex = splitMeta.length - 1;

    // --------------------------------------------------------
    // BUILD TABLE
    // --------------------------------------------------------
    let html = `
        <table class="top6-table">
            <thead>
                <tr>
                    <th class="col-left col-rank">#</th>
                    <th class="col-left col-bib">BIB</th>
                    <th class="col-left col-ak">AK</th>
                    <th class="col-left col-name">Name</th>
                    <th class="col-left col-club">Verein</th>
    `;

    splitLabels.forEach((label, idx) => {
        const extraClass =
            idx === lastSplitIndex
                ? "split-finish"
                : "split-mid";

        html += `<th class="col-right ${extraClass}">${label}</th>`;
    });

    html += `
                </tr>
            </thead>
            <tbody>
    `;

    top6.forEach(r => {
        const ln = toUppercaseName(r.last_name || "");
        const fn = r.first_name || "";

        html += `
            <tr>
                <td class="col-left col-rank">${r.pos_gender}.</td>
                <td class="col-left col-bib">${r.bib}</td>
                <td class="col-left col-ak">${r.pos_ag}. ${genderPrefix}${r.age_group}</td>

                <td class="col-left col-name">
                    <span class="top6-lastname">${ln}</span>
                    <span class="top6-firstname">${fn}</span>
                </td>

                <td class="col-left col-club">${r.club ?? ""}</td>
        `;

        splitMeta.forEach((_, idx) => {
            const s = r.splits[idx];
            const extraClass =
                idx === lastSplitIndex
                    ? "split-finish"
                    : "split-mid";

            html += `<td class="col-right ${extraClass}">${s ? s.time : "-"}</td>`;
        });

        html += "</tr>";
    });

    html += "</tbody></table>";
    box.innerHTML = html;
}

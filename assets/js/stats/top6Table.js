// top6Table.js
import { loadRaceStats, getRaceStats } from "./raceStatsLoader.js";

// ======================================================================
// RENDER TABLES (M/W)
// ======================================================================
export async function renderTop6Tables(raceName) {
    await loadRaceStats(raceName);
    const race = getRaceStats(raceName);

    renderOne("top6TableM", race.M.Top10.slice(0, 6), race.splits);
    renderOne("top6TableW", race.W.Top10.slice(0, 6), race.splits);
}

// ======================================================================
// INTERNAL RENDER FUNCTION
// ======================================================================
function renderOne(containerId, top6, splitMeta) {
    const box = document.getElementById(containerId);
    if (!box) return;

    if (!top6 || top6.length === 0) {
        box.innerHTML = "<p>Keine Daten verfügbar.</p>";
        return;
    }

    // Name uppercase + ß → ẞ
    const toUppercaseName = (str) =>
        str.replace(/ß/g, "ẞ").toUpperCase();

    // M20 / W20 prefix in AK column
    const genderPrefix = containerId.endsWith("M") ? "M" : "W";

    // Only distances (e.g. "12.5km")
    const splitLabels = splitMeta.map(s => `${s.distance_km}km`);

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

import { resolveElement } from "./chartLifecycle.js";
import { formatNumber } from "./format.js";
// federalStateTable.js

import { loadGeoData } from "./dataLoader.js";

// ======================================================================
//  PUBLIC FUNCTION – render full table
// ======================================================================
export async function renderFederalStateTable(target = "federalStateTable") {
    const table = resolveElement(target);
    if (!table) return;
    const geo = await loadGeoData();

    if (!geo || !geo.bundesland_buckets) {
        throw new Error("bundesland_buckets not found in geo data");
    }

    buildFederalStateTable(geo, table);
}

// ======================================================================
//  INTERNAL BUILDER – Creates rows dynamically
// ======================================================================
export function federalStateRows(geo) {
    const bundeslaender = geo.bundesland_buckets;
    const list = [];
    let unknownCount = 0;
    let hasUnknown = false;

    // --------------------------------------------------
    //  Convert object → array entries with parsed names
    // --------------------------------------------------
    for (const rawName of Object.keys(bundeslaender)) {
        const count = bundeslaender[rawName];

        // remove "[SH]" prefix
        const cleanedName = rawName.replace(/^\[[A-Z]{2}\]\s*/, "");

        // extract country code like "[SH]"
        const codeMatch = rawName.match(/^\[([A-Z]{2})\]/);
        const code = codeMatch ? codeMatch[1].toLowerCase() : "xx";

        if (code === "xx") {
            unknownCount += count;
            hasUnknown = true;
            continue;
        }

        list.push({
            code,
            name: cleanedName,
            count,
            flag: new URL(`../../img/flags/deu/${code}.png`, import.meta.url).href
        });
    }
    
    // --------------------------------------------------
    //  Sort descending by count
    // --------------------------------------------------
    list.sort((a, b) => b.count - a.count);

    // --------------------------------------------------
    //  Summary categories follow the sorted federal states.
    // --------------------------------------------------
    const internationalCount = Number.isFinite(geo.international_participants)
        ? geo.international_participants
        : geo.land_buckets ? Object.entries(geo.land_buckets)
            .filter(([country]) => country !== "Deutschland")
            .reduce((sum, [, count]) => sum + count, 0) : null;

    if (internationalCount !== null) list.push({
        code: "intl",
        name: "Ausland",
        count: internationalCount,
        flag: new URL("../../img/flags/world/int.png", import.meta.url).href
    });
    if (hasUnknown) list.push({
        code: "xx",
        name: "Unbekannt",
        count: unknownCount,
        flag: new URL("../../img/flags/deu/xx.png", import.meta.url).href
    });
    return list;
}

function buildFederalStateTable(geo, table) {
    const list = federalStateRows(geo);
    let tbody = table.querySelector("tbody");
    if (!tbody) {
        tbody = document.createElement("tbody");
        table.appendChild(tbody);
    }
    tbody.innerHTML = "";

    // --------------------------------------------------
    //  Render rows
    // --------------------------------------------------
    list.forEach(entry => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        const tdCount = document.createElement("td");
        tdCount.classList.add("count");

        // flag + name wrapper
        const row = document.createElement("div");
        row.className = "flag-row";

        const img = document.createElement("img");
        img.className = "nationality-flag";
        img.src = entry.flag;
        img.alt = entry.code;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = entry.name;

        row.appendChild(img);
        row.appendChild(nameSpan);

        tdName.appendChild(row);
        tdCount.textContent = formatNumber(entry.count);

        tr.appendChild(tdName);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
    });
}

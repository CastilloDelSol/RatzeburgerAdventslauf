// federalStateTable.js

import { loadGeoData } from "./dataLoader.js";

// ======================================================================
//  PUBLIC FUNCTION – render full table
// ======================================================================
export async function renderFederalStateTable() {
    const geo = await loadGeoData();

    if (!geo || !geo.bundesland_buckets) {
        console.error("bundesland_buckets not found in geo data");
        return;
    }

    buildFederalStateTable(geo);
}

// ======================================================================
//  INTERNAL BUILDER – Creates rows dynamically
// ======================================================================
function buildFederalStateTable(geo) {

    const bundeslaender = geo.bundesland_buckets;

    const table = document.querySelector("#federalStateTable");
    if (!table) {
        console.error("federalStateTable element not found");
        return;
    }

    // Ensure <tbody> exists
    let tbody = table.querySelector("tbody");
    if (!tbody) {
        tbody = document.createElement("tbody");
        table.appendChild(tbody);
    }

    tbody.innerHTML = ""; // reset content

    let sumStates = 0;
    const list = [];

    // --------------------------------------------------
    //  Convert object → array entries with parsed names
    // --------------------------------------------------
    for (const rawName of Object.keys(bundeslaender)) {
        const count = bundeslaender[rawName];
        sumStates += count;

        // remove "[SH]" prefix
        const cleanedName = rawName.replace(/^\[[A-Z]{2}\]\s*/, "");

        // extract country code like "[SH]"
        const codeMatch = rawName.match(/^\[([A-Z]{2})\]/);
        const code = codeMatch ? codeMatch[1].toLowerCase() : "xx";

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
    //  Add last row "Ausland"
    // --------------------------------------------------
    const internationalCount = Object.entries(geo.land_buckets)
    .filter(([country]) => country !== "Deutschland")
    .reduce((sum, [, count]) => sum + count, 0);

    list.push({
        code: "intl",
        name: "Ausland",
        count: internationalCount,
        flag: new URL("../../img/flags/world/int.png", import.meta.url).href
    });

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
        tdCount.textContent = entry.count;

        tr.appendChild(tdName);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
    });
}

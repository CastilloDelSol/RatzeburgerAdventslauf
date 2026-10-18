import { resolveElement } from "./chartLifecycle.js";
import { formatNumber } from "./format.js";
// nationalityTable.js

import { loadNationalityData } from "./dataLoader.js";

// ======================================================================
//  RENDER FULL NATIONALITY TABLE
// ======================================================================
export async function renderNationalityTable(target = "nationalityTable") {
    const table = resolveElement(target);
    if (!table) return;
    const list = await loadNationalityData();
    buildNationalityTable(list, table);
}

// ======================================================================
//  INTERNAL: Builds the table rows
// ======================================================================
function buildNationalityTable(list, table) {
    const sorted = [...list].sort((a, b) => b.count - a.count);

    // Ensure <tbody> exists
    let tbody = table.querySelector("tbody");
    if (!tbody) {
        tbody = document.createElement("tbody");
        table.appendChild(tbody);
    }

    tbody.innerHTML = ""; // clear previous content

    sorted.forEach(entry => {
        const tr = document.createElement("tr");

        const tdLand = document.createElement("td");
        const tdCount = document.createElement("td");
        tdCount.classList.add("count");

        const wrapper = document.createElement("div");
        wrapper.className = "flag-row";

        if (entry.flag) {
            const img = document.createElement("img");
            img.className = "nationality-flag";
            img.src = entry.flag;
            img.alt = entry.code;
            wrapper.appendChild(img);
        }

        const text = document.createElement("span");
        text.textContent = entry.land;
        wrapper.appendChild(text);

        tdLand.appendChild(wrapper);
        tdCount.textContent = formatNumber(entry.count);

        tr.appendChild(tdLand);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
    });
}

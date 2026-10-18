// nationalityTable.js

import { loadNationalityData } from "./dataLoader.js";

// ======================================================================
//  RENDER FULL NATIONALITY TABLE
// ======================================================================
export async function renderNationalityTable() {
    const list = await loadNationalityData();
    buildNationalityTable(list);
}

// ======================================================================
//  INTERNAL: Builds the table rows
// ======================================================================
function buildNationalityTable(list) {
    const sorted = [...list].sort((a, b) => b.count - a.count);

    const table = document.querySelector("#nationalityTable");
    if (!table) {
        console.error("nationalityTable element not found");
        return;
    }

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
        tdCount.textContent = entry.count;

        tr.appendChild(tdLand);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
    });
}

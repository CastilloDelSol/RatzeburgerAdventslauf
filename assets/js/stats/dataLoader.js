import { loadJson } from "../jsonLoader.js";

let ageData = null;
let nationalityData = null;
let geoData = null;
let checkpointData = null;

export async function loadAgeData() {
    ageData = await loadJson("./data/age_buckets_by_distance.json");
    return ageData;
}

export function getSection(sectionName) {
    if (!ageData) throw new Error("Age data not loaded yet");
    return ageData[sectionName];
}

export async function loadNationalityData() {
    nationalityData = await loadJson("./data/nationality.json");
    return nationalityData;
}

export function getNationalityList() {
    if (!nationalityData) throw new Error("Nationality data not loaded yet");
    return nationalityData;
}

export async function loadGeoData() {
    geoData = await loadJson("./data/geo-stats.json");
    return geoData;
}

export function getGeoData() {
    if (!geoData) throw new Error("Geo data not loaded yet");
    return geoData;
}

export async function loadCheckpointData() {
    checkpointData = await loadJson("./data/time_buckets.json");
    return checkpointData;
}

export function getCheckpointData() {
    if (!checkpointData) throw new Error("Checkpoint data not loaded yet");
    return checkpointData;
}

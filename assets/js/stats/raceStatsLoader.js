import { loadJson } from "../jsonLoader.js";

const raceStats = {};
const raceFiles = {
    hauptlauf: "./data/hauptlauf_stats.json",
    kurzstrecke: "./data/kurzstrecke_stats.json"
};

export async function loadRaceStats(raceName) {
    if (!Object.hasOwn(raceFiles, raceName)) throw new Error("Unknown raceName: " + raceName);
    raceStats[raceName] = await loadJson(raceFiles[raceName]);
    return raceStats[raceName];
}

export function getRaceStats(raceName) {
    if (!raceStats[raceName]) throw new Error(`Race stats "${raceName}" not loaded yet`);
    return raceStats[raceName];
}

export function listAvailableRaces() {
    return Object.keys(raceFiles);
}

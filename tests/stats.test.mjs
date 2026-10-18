import test from "node:test";
import assert from "node:assert/strict";
import { formatNumber, formatPercent, formatTime, formatCheckpointTime } from "../assets/js/stats/format.js";
import { computeKDE, scaleKDE } from "../assets/js/stats/kde.js";
import { buildRaceSeries } from "../assets/js/stats/checkpointHistograms.js";
import { replaceChart, destroyChart } from "../assets/js/stats/chartLifecycle.js";

test("German number and percentage formatting handles empty totals", () => {
    assert.equal(formatNumber(3031), "3.031");
    assert.equal(formatNumber(7.5, 1), "7,5");
    assert.equal(formatPercent(1, 3), "33,3%");
    assert.equal(formatPercent(0, 0), "0,0%");
});

test("time formatting preserves hours and truncates seconds at boundaries", () => {
    assert.equal(formatTime(0), "00:00:00");
    assert.equal(formatTime(3599.9), "00:59:59");
    assert.equal(formatTime(3600), "01:00:00");
    assert.equal(formatTime(90061), "25:01:01");
    assert.equal(formatTime(4500, { showSeconds: false, padHours: false }), "1:15");
    assert.equal(formatTime(null), "");
    assert.equal(formatTime(NaN), "");
});

test("checkpoint timestamps use the event timezone, independent of the machine", () => {
    assert.equal(formatCheckpointTime(40500), "11:15:00");
    const timestamp = Date.UTC(2025, 10, 30, 10, 15) / 1000;
    assert.equal(formatCheckpointTime(timestamp), "11:15:00");
    assert.equal(formatCheckpointTime(timestamp, { showSeconds: false, timeZone: "UTC" }), "10:15");
});

test("shared KDE preserves the weighted Gaussian values", () => {
    const values = computeKDE([-1, 0, 1], [1, 0, 1], 1);
    assert(Math.abs(values[0] - 0.4529332469146208) < 1e-12);
    assert(Math.abs(values[1] - 0.48394144903828673) < 1e-12);
    assert.equal(values[0], values[2]);
    assert.equal(Math.max(...scaleKDE(values, [1, 0, 1])), 1);
});

test("empty and zero-count histograms never produce NaN or infinity", () => {
    assert.deepEqual(computeKDE([], [], 45), []);
    assert.deepEqual(scaleKDE([], []), []);
    assert.deepEqual(scaleKDE(computeKDE([10, 20], [0, 0]), [0, 0]), [0, 0]);
});

test("checkpoint series include races appearing after the first bucket", () => {
    const buckets = [
        { athlete_counts: [{ race_id: 0, count: 0 }, { race_id: 2, count: 0 }] },
        { athlete_counts: [{ race_id: 0, count: 2 }, { race_id: 1, count: 3 }] }
    ];
    assert.deepEqual(buildRaceSeries(buckets, [{ race_id: 1, name: "Kinderlauf" }]), [
        { label: "Race 0", counts: [0, 2] }, { label: "Kinderlauf", counts: [0, 3] }
    ]);
    assert.deepEqual(buildRaceSeries([]), []);
});

test("replacing one canvas keeps other chart instances alive and clears empty results", t => {
    const original = globalThis.Chart;
    t.after(() => { if (original) globalThis.Chart = original; else delete globalThis.Chart; });
    const instances = new Map();
    globalThis.Chart = class {
        static getChart(canvas) { return instances.get(canvas); }
        constructor(canvas) { this.canvas = canvas; instances.set(canvas, this); }
        destroy() { this.destroyed = true; instances.delete(this.canvas); }
    };
    const canvas = () => ({ width: 100, height: 100, getContext: () => ({ clearRect() {} }) });
    const a = canvas(), b = canvas();
    const first = replaceChart(a, {});
    const second = replaceChart(b, {});
    const replacement = replaceChart(a, {});
    assert.equal(first.destroyed, true);
    assert.equal(second.destroyed, undefined);
    assert.equal(instances.get(a), replacement);
    destroyChart(a);
    assert.equal(instances.has(a), false);
    assert.equal(instances.get(b), second);
});

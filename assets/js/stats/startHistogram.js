import { renderCheckpointHistogram } from "./checkpointHistograms.js";

export async function renderStartHistogram(target) {
    return renderCheckpointHistogram(target, "start_histogram_buckets");
}

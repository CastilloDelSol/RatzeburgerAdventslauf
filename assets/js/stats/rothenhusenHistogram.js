import { renderCheckpointHistogram } from "./checkpointHistograms.js";

export async function renderRothenhusenHistogram(target) {
    return renderCheckpointHistogram(target, "split_rothenhusen_histogram_buckets");
}

import { renderCheckpointHistogram } from "./checkpointHistograms.js";

export async function renderFinishHistogram(target) {
    return renderCheckpointHistogram(target, "finish_histogram_buckets");
}

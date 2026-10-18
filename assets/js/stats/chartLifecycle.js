// Keep ownership on the canvas, so additional charts of the same type can coexist.
export function resolveElement(target) {
    return typeof target === "string" ? document.getElementById(target) : target;
}

export function destroyChart(target) {
    const canvas = resolveElement(target);
    if (!canvas) return;
    Chart.getChart(canvas)?.destroy();
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

export function replaceChart(target, configuration) {
    const canvas = resolveElement(target);
    if (!canvas) return null;
    destroyChart(canvas);
    return new Chart(canvas, configuration);
}

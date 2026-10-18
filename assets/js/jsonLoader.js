// Relative URLs belong to the current year's HTML page, not this shared module.
const requests = new Map();

export function loadJson(path) {
    const url = new URL(path, document.baseURI).href;
    if (!requests.has(url)) {
        const request = fetch(url).then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
            return response.json();
        });
        requests.set(url, request);
        // A temporary failure must not remain cached for the rest of the visit.
        request.catch(() => requests.delete(url));
    }
    return requests.get(url);
}

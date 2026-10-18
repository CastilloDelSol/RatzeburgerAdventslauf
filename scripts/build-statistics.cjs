// Aggregate only; never copy addresses, individual coordinates or OSM queries.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REFERENCE = { name: 'Marktplatz Ratzeburg', lat: 53.699283, lon: 10.774161 };
const EARTH_RADIUS_KM = 6371.0088;
const STATES = {
    BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg',
    HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern',
    NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz',
    SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen'
};
const normalize = text => String(text ?? '').normalize('NFKC').trim().toLocaleLowerCase('de-DE');

function parseCSV(text) {
    const records = [];
    let row = [], value = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (quoted && text[i + 1] === '"') { value += '"'; i++; }
            else quoted = !quoted;
        } else if (char === ',' && !quoted) { row.push(value); value = ''; }
        else if ((char === '\n' || char === '\r') && !quoted) {
            row.push(value);
            if (row.some(field => field.trim())) records.push(row);
            row = []; value = '';
            if (char === '\r' && text[i + 1] === '\n') i++;
        } else value += char;
    }
    if (quoted) throw new Error('Nicht geschlossenes Anführungszeichen in CSV');
    row.push(value);
    if (row.some(field => field.trim())) records.push(row);
    const headers = records.shift()?.map(field => field.trim());
    for (const key of ['origin', 'country', 'federal_state_germany', 'lat', 'lon', 'status']) {
        if (!headers?.includes(key)) throw new Error('CSV-Spalte fehlt: ' + key);
    }
    return records.map((fields, index) => {
        if (fields.length !== headers.length) throw new Error('Falsche Spaltenzahl in CSV-Datensatz ' + (index + 1));
        return Object.fromEntries(headers.map((header, position) => [header, fields[position]]));
    });
}

function numeric(value) {
    if (String(value ?? '').trim() === '') return NaN;
    return Number(String(value).trim().replace(',', '.'));
}

function coordinates(row) {
    const lat = numeric(row.lat), lon = numeric(row.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
        ? { lat, lon } : null;
}

function distanceKm(lat, lon, reference = REFERENCE) {
    const radians = angle => angle * Math.PI / 180;
    const startLat = radians(reference.lat), endLat = radians(lat);
    const a = Math.sin((endLat - startLat) / 2) ** 2
        + Math.cos(startLat) * Math.cos(endLat) * Math.sin(radians(lon - reference.lon) / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

function stateCode(value) {
    return Object.entries(STATES).find(([code, name]) =>
        [normalize(name), normalize(code), normalize(`[${code}] ${name}`)].includes(normalize(value)))?.[0];
}

function cityState(row) {
    if (normalize(row.status) !== 'ok') return undefined;
    // City-state names can be present where Nominatim omitted address.state.
    // A leading postal code is allowed; postal codes alone are never guessed.
    const city = normalize(row.origin).replace(/^\d{5}\s+/, '');
    return { hamburg: 'HH', berlin: 'BE', bremen: 'HB', bremerhaven: 'HB' }[city];
}

function percentile(sorted, percent) {
    const index = (sorted.length - 1) * percent / 100;
    const lower = Math.floor(index), upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function distanceHistogram(distances) {
    const edges = [...Array.from({ length: 21 }, (_, index) => index * 10), 300, 500, 1000, 5000];
    if (Math.max(...distances) > 5000) edges.push(Math.ceil(Math.max(...distances) / 1000) * 1000);
    return edges.slice(0, -1).map((min, index) => ({
        min, max: edges[index + 1],
        count: distances.filter(value => value >= min && (value < edges[index + 1]
            || (index === edges.length - 2 && value === edges[index + 1]))).length
    }));
}

function aggregate(rows) {
    const distances = [];
    const counts = Object.fromEntries(Object.keys(STATES).map(code => [code, 0]));
    const statusCounts = {};
    let international = 0, unknown = 0, derivedStates = 0, unknownWithCoordinates = 0;
    for (const row of rows) {
        const status = String(row.status ?? '').trim() || 'MISSING';
        statusCounts[status] = (statusCounts[status] ?? 0) + 1;
        const pair = coordinates(row);
        if (normalize(status) === 'ok' && pair) distances.push(distanceKm(pair.lat, pair.lon));

        const country = normalize(row.country);
        if (country && !['deutschland', 'germany', 'de', 'deu'].includes(country)) {
            international++;
            continue;
        }
        const extracted = stateCode(row.federal_state_germany);
        const derived = extracted ? undefined : cityState(row);
        if (extracted || derived) counts[extracted || derived]++;
        else {
            unknown++;
            if (normalize(status) === 'ok' && pair) unknownWithCoordinates++;
        }
        if (derived) derivedStates++;
    }
    distances.sort((a, b) => a - b);
    if (!distances.length) throw new Error('Keine Datensätze mit Status OK und gültigen Koordinaten vorhanden');
    const round = value => Number(value.toFixed(2));
    const labels = ['<10 km', '10-25 km', '25-50 km', '50-100 km', '100-250 km', '>250 km'];
    const buckets = Object.fromEntries(labels.map(label => [label, 0]));
    for (const value of distances) {
        const index = value < 10 ? 0 : value < 25 ? 1 : value < 50 ? 2 : value < 100 ? 3 : value <= 250 ? 4 : 5;
        buckets[labels[index]]++;
    }
    return {
        total_participants: rows.length,
        distance_participants: distances.length,
        distance_missing: rows.length - distances.length,
        distance_min_km: Number(distances[0].toFixed(3)),
        distance_max_km: round(distances.at(-1)),
        distance_avg_km: round(distances.reduce((sum, value) => sum + value, 0) / distances.length),
        distance_median_km: round(percentile(distances, 50)),
        percentiles_km: Object.fromEntries(Array.from({ length: 101 }, (_, p) => [p + '%', round(percentile(distances, p))])),
        distance_buckets: buckets,
        distance_histogram: distanceHistogram(distances),
        bundesland_buckets: {
            ...Object.fromEntries(Object.entries(STATES).map(([code, name]) => [`[${code}] ${name}`, counts[code]])),
            '[XX] Unbekannt': unknown
        },
        international_participants: international,
        metadata: {
            distance_method: 'Haversine-Luftlinie aus lat/lon; distance-Spalte nicht verwendet',
            distance_reference: REFERENCE,
            earth_radius_km: EARTH_RADIUS_KM,
            distance_inclusion: 'Status OK und gültige Koordinaten; fehlende Werte werden nicht als 0 km gezählt',
            percentile_method: 'Lineare Interpolation bei (n - 1) * p / 100',
            federal_state_method: 'CSV-Bundesland; bei fehlendem Wert eindeutiger Stadtstaat in origin und Status OK; sonst unbekannt',
            federal_states_from_city: derivedStates,
            unassigned_states_with_coordinates: unknownWithCoordinates,
            status_counts: statusCounts
        }
    };
}

if (require.main === module) {
    const [input, output] = process.argv.slice(2);
    if (!input || !output) throw new Error('Aufruf: node scripts/build-statistics.cjs <CSV> <JSON>');
    const source = fs.readFileSync(input);
    const stats = aggregate(parseCSV(source.toString('utf8')));
    stats.metadata.source_file = path.basename(input);
    stats.metadata.source_sha256 = crypto.createHash('sha256').update(source).digest('hex');
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(stats, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({ file: output, total: stats.total_participants,
        distances: stats.distance_participants, missing_distances: stats.distance_missing,
        unassigned_states: stats.bundesland_buckets['[XX] Unbekannt'],
        international: stats.international_participants, min_km: stats.distance_min_km,
        max_km: stats.distance_max_km, average_km: stats.distance_avg_km,
        median_km: stats.distance_median_km, derived_states: stats.metadata.federal_states_from_city }, null, 2));
}

module.exports = { parseCSV, aggregate, distanceKm, percentile, distanceHistogram };

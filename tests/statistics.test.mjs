import test from "node:test";
import assert from "node:assert/strict";
import builder from "../scripts/build-statistics.cjs";
import { federalStateRows } from "../assets/js/stats/federalStateTable.js";

const { parseCSV, aggregate, distanceKm, percentile, distanceHistogram } = builder;
const reference = { lat: '53.699283', lon: '10.774161' };

test("CSV quoting preserves embedded commas, quotes, newlines and leading postal zeroes", () => {
    const csv = '\uFEFFstreet,zipcode,origin,country,federal_state_germany,lat,lon,distance,status,osm_query\r\n'
        + '"Test, ""Weg""\n2",01234,Hamburg,Deutschland,,53.699283,10.774161,999999,OK,\r\n';
    const [row] = parseCSV(csv);
    assert.equal(row.street, 'Test, "Weg"\n2');
    assert.equal(row.zipcode, '01234');
    assert.equal(row.distance, '999999');
    assert.equal(parseCSV(csv).length, 1);
});

test("Haversine uses kilometers and returns zero for the same location", () => {
    assert.equal(distanceKm(Number(reference.lat), Number(reference.lon)), 0);
    assert(Math.abs(distanceKm(0, 1, { lat: 0, lon: 0 }) - 111.1950802335329) < 1e-9);
});

test("aggregate recomputes distances, separates unknown states and does not zero-fill missing coordinates", () => {
    const common = { country: 'Deutschland', federal_state_germany: '', origin: '', status: 'OK' };
    const rows = [
        { ...common, ...reference, origin: '22763 Hamburg', distance: '999999' },
        { ...common, origin: 'Berlin', lat: '52.52', lon: '13.405' },
        { ...common, federal_state_germany: 'Schleswig-Holstein', lat: '', lon: '' },
        { ...common, country: 'Dänemark', lat: '55.67', lon: '12.56' },
        { ...common, origin: 'Hamburg', status: 'NOT_FOUND', lat: '', lon: '' },
        { ...common, ...reference, origin: '20095' }
    ];
    const stats = aggregate(rows);
    assert.equal(stats.total_participants, 6);
    assert.equal(stats.distance_participants, 4);
    assert.equal(stats.distance_missing, 2);
    assert.equal(stats.distance_min_km, 0);
    assert.equal(stats.bundesland_buckets['[HH] Hamburg'], 1);
    assert.equal(stats.bundesland_buckets['[BE] Berlin'], 1);
    assert.equal(stats.bundesland_buckets['[SH] Schleswig-Holstein'], 1);
    assert.equal(stats.bundesland_buckets['[XX] Unbekannt'], 2);
    assert.equal(stats.international_participants, 1);
    assert.equal(stats.metadata.federal_states_from_city, 2);
    assert.equal(stats.metadata.unassigned_states_with_coordinates, 1);
    assert.equal(Object.values(stats.bundesland_buckets).reduce((sum, count) => sum + count, 0) + stats.international_participants, stats.total_participants);
    assert.equal(stats.distance_histogram.reduce((sum, bin) => sum + bin.count, 0), stats.distance_participants);
    assert.equal(Object.values(stats.distance_buckets).reduce((sum, count) => sum + count, 0), stats.distance_participants);
    for (const field of ['wind_rose', 'directional_distance_buckets', 'land_buckets', 'kreis_buckets', 'top3_hexagons_r7']) assert.equal(field in stats, false);
});

test("histogram boundaries count each sample exactly once, including the final maximum", () => {
    const distances = [0, 9.999, 10, 199.99, 200, 5000, 6000];
    const bins = distanceHistogram(distances);
    assert.equal(bins[0].count, 2);
    assert.equal(bins[1].count, 1);
    assert.equal(bins.find(bin => bin.min === 200).count, 1);
    assert.equal(bins.at(-1).count, 2);
    assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), distances.length);
});

test("percentiles use linear interpolation and stay defined for one valid address", () => {
    assert.equal(percentile([0, 10, 20, 30], 25), 7.5);
    assert.equal(percentile([0, 10, 20, 30], 50), 15);
    assert.equal(percentile([5], 99), 5);
    assert.throws(() => aggregate([{ status: 'NOT_FOUND' }]), /Keine Datensätze/);
});

test("federal-state table supports compact statistics and the legacy country buckets", () => {
    const compact = federalStateRows({ bundesland_buckets: {
        '[XX] Unbekannt': 30, '[SH] Schleswig-Holstein': 4, '[HH] Hamburg': 7
    }, international_participants: 2 });
    assert.deepEqual(compact.map(row => row.name), ['Hamburg', 'Schleswig-Holstein', 'Ausland', 'Unbekannt']);
    assert(compact.at(-1).flag.endsWith('/deu/xx.png'));
    assert.equal(compact.at(-1).count, 30);
    assert.equal(compact[2].count, 2);
    const legacy = federalStateRows({ bundesland_buckets: { '[SH] Schleswig-Holstein': 4 }, land_buckets: { Deutschland: 4, Dänemark: 1 } });
    assert.equal(legacy.at(-1).count, 1);
    assert.equal(federalStateRows({ bundesland_buckets: { '[XX] Nicht zuordenbar': 3 } }).at(-1).name, 'Unbekannt');
    assert.equal(federalStateRows({ bundesland_buckets: {} }).length, 0);
});

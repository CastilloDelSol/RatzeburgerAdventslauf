// No npm dependencies: Node 22+ and a Chromium browser with DevTools support.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'adventslauf-reuse-'));
const browserPath = process.env.BROWSER_PATH || [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].find(file => fs.existsSync(file));
if (!browserPath) throw new Error('Set BROWSER_PATH to an installed Chromium browser.');
const requests = [];
const baselineFiles = new Map();

function omitPanel(html, number) {
    const start = html.indexOf(`<div class="tab-content content${number}">`);
    assert(start >= 0, 'Panel not found: ' + number);
    const tags = /<div\b[^>]*>|<\/div>/g;
    tags.lastIndex = start;
    let depth = 0, tag;
    while ((tag = tags.exec(html))) {
        depth += tag[0].startsWith('</') ? -1 : 1;
        if (!depth) return html.slice(0, start) + html.slice(tags.lastIndex);
    }
    throw new Error('Unbalanced panel markup');
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const baseline = url.pathname.startsWith('/baseline/');
    const relative = decodeURIComponent(url.pathname).replace(/^\/(Adventslauf|baseline)\//, '');
    const target = path.resolve(root, relative);
    const referer = req.headers.referer || '';
    requests.push(url.pathname);
    if (!target.startsWith(root + path.sep) || (/(?:geo-stats|statistics)\.json$/.test(relative) && referer.includes('fail=geo'))) {
        res.writeHead(404); res.end('Not found'); return;
    }
    let data;
    try {
        if (baseline) {
            if (!baselineFiles.has(relative)) baselineFiles.set(relative, execFileSync('git', ['show', `HEAD:${relative}`], { cwd: root, maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }));
            data = baselineFiles.get(relative);
        } else data = fs.readFileSync(target);
    } catch { res.writeHead(404); res.end('Not found'); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.png': 'image/png' };
    res.setHeader('Content-Type', (mime[path.extname(target)] || 'text/plain') + (target.endsWith('.png') ? '' : '; charset=utf-8'));
    res.setHeader('Cache-Control', 'no-store');
    if (url.searchParams.has('omit')) {
        data = url.searchParams.get('omit').split(',').reduce(omitPanel, data.toString('utf8'));
    }
    if (url.searchParams.has('extra')) {
        data = data.toString('utf8').replace('</body>', `
<div class="donut-box"><div class="donut-chart-wrapper"><canvas id="another-total" data-chart="gender" data-section="TOTAL"></canvas></div></div>
<div class="card"><div class="chart-box"><canvas id="another-men" data-chart="deficit" data-race="hauptlauf" data-gender="M"></canvas></div></div>
<div id="arbitrary-table" data-table="top6" data-race="hauptlauf" data-gender="W"></div>
</body>`).replace('id="donutTotal"', 'id="renamed-total"').replace('id="chartHaupt"', 'id="renamed-pyramid"');
    }
    if (referer.includes('delay=1') && /_stats\.json$/.test(relative)) setTimeout(() => res.end(data), 600);
    else res.end(data);
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser, socket;
const deadline = setTimeout(() => {
    console.error('Browser verification timed out');
    socket?.close(); browser?.kill(); server.close(); process.exit(1);
}, 180000);

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`,
        '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    browser.on('error', error => { console.error(error); process.exitCode = 1; });
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile) && i < 150; i++) await delay(100);
    assert(fs.existsSync(portFile), 'Browser debugger did not start');
    const debugPort = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`, { signal: AbortSignal.timeout(5000) })).json();
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0, errors = [];
    const pending = new Map();
    socket.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.id) {
            const callback = pending.get(message.id);
            if (!callback) return;
            pending.delete(message.id); clearTimeout(callback.timer);
            if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
            else callback.resolve(message.result);
        } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    };
    const call = (method, params = {}) => new Promise((resolve, reject) => {
        const next = ++id;
        const timer = setTimeout(() => { pending.delete(next); reject(new Error('DevTools timeout: ' + method)); }, 15000);
        pending.set(next, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: next, method, params }));
    });
    const evaluate = async expression => {
        const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };
    await call('Runtime.enable'); await call('Page.enable');
    async function waitFor(expression) {
        for (let i = 0; i < 200; i++) {
            if (await evaluate(expression)) { assert.equal(errors.length, 0, JSON.stringify(errors)); return; }
            await delay(100);
        }
        throw new Error('Page did not become ready: ' + expression + '\n' + await evaluate('document.body.innerText'));
    }
    async function open(relative, ready, prefix = 'Adventslauf') {
        errors = [];
        const start = requests.length;
        await call('Page.navigate', { url: `http://127.0.0.1:${port}/${prefix}/${relative}` });
        await waitFor(`document.readyState === 'complete' && (${ready})`);
        return requests.slice(start);
    }
    const idle = 'document.querySelectorAll("[aria-busy=true]").length === 0';
    const chartCount = count => `typeof Chart !== 'undefined' && Object.keys(Chart.instances).length === ${count}`;
    // Reusing one scaling formula can change the final floating-point bit.
    // Compare at twelve significant digits while retaining exact counts/labels.
    const snapshot = async () => JSON.parse(JSON.stringify(await evaluate(`Object.fromEntries(Object.values(Chart.instances).map(chart => [chart.canvas.id, {
        labels: chart.data.labels,
        datasets: chart.data.datasets.map(set => ({ label: set.label, data: set.data }))
    }]))`), (key, value) => typeof value === 'number' ? Number(value.toPrecision(12)) : value));

    await open('2025/stats/index.html', chartCount(16), 'baseline');
    const before = await snapshot();
    console.log('PASS: captured all 16 charts from the last Git commit');

    let loaded = await open('2025/stats/index.html', `${chartCount(16)} && ${idle}`);
    assert.deepEqual(await snapshot(), before, 'Diagram data changed compared with HEAD');
    assert.equal(await evaluate('document.querySelectorAll(".load-error").length'), 0);
    const json = loaded.filter(file => file.endsWith('.json'));
    assert.equal(json.length, 5); assert.equal(new Set(json).size, 5);
    assert.equal(await evaluate('[...document.querySelectorAll("#federalStateTable img")].every(img=>img.src.includes("/Adventslauf/assets/img/") && img.complete && img.naturalWidth > 0)'), true);
    for (let n = 1; n <= 8; n++) {
        await evaluate(`document.querySelector('label[for=tab${n}]').click()`);
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('.content${n}')).display`), 'block');
    }
    await evaluate('document.querySelector("label[for=tab1]").click()');
    await evaluate('Object.values(Chart.instances).forEach(chart => { chart.stop(); chart.update("none"); })');
    await delay(250);
    const image = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(profile, 'stats-2025.png'), Buffer.from(image.data, 'base64'));
    await evaluate('for (const id of ["top6Select", "histSelect", "akSelect"]) { const s = document.getElementById(id); s.value = "kurzstrecke"; s.dispatchEvent(new Event("change")); }');
    await waitFor(idle);
    const shortRace = await snapshot();
    assert.notDeepEqual(shortRace.deficitChartM, before.deficitChartM);
    assert.notDeepEqual(shortRace.histM, before.histM);
    await evaluate('document.getElementById("resultDataType").value="median"; document.getElementById("resultDataType").dispatchEvent(new Event("change"))');
    await waitFor(idle);
    assert.notDeepEqual((await snapshot()).akBarsM, shortRace.akBarsM);
    assert.equal(await evaluate('Object.keys(Chart.instances).length'), 16);
    console.log('PASS: all data unchanged, eight tabs, shared flags, cached JSON, race/metric dropdowns');

    await open('2025/stats/index.html?extra=1', `${chartCount(18)} && ${idle}`);
    let extra = await snapshot();
    assert.deepEqual(extra['renamed-total'], before.donutTotal);
    assert.deepEqual(extra['renamed-pyramid'], before.chartHaupt);
    assert.deepEqual(extra['another-total'], before.donutTotal);
    assert.deepEqual(extra['another-men'], before.deficitChartM);
    assert.equal(await evaluate('[...document.querySelectorAll("#arbitrary-table tbody tr")].every(row=>row.cells[2].textContent.includes("W"))'), true);
    await evaluate('document.getElementById("top6Select").value="kurzstrecke"; document.getElementById("top6Select").dispatchEvent(new Event("change"))');
    await waitFor(idle);
    extra = await snapshot();
    assert.deepEqual(extra['another-men'], before.deficitChartM);
    assert.deepEqual(extra.deficitChartM, shortRace.deficitChartM);
    assert.equal(await evaluate('Object.keys(Chart.instances).length'), 18);
    console.log('PASS: arbitrary HTML IDs, extra charts and explicit table gender require no JavaScript changes');

    loaded = await open('2025/stats/index.html?omit=1,5,6,7,8', `${chartCount(4)} && ${idle}`);
    assert(!loaded.some(file => /_stats\.json$/.test(file)));
    assert.equal(await evaluate('document.querySelector("label[for=tab1]").hidden && document.getElementById("tab2").checked'), true);
    console.log('PASS: commented panels skip result data and select a remaining tab');

    await open('2025/stats/index.html?delay=1', 'document.querySelectorAll("[aria-busy=true]").length > 0');
    await evaluate('for (const value of ["kurzstrecke","hauptlauf","kurzstrecke"]) { for (const id of ["top6Select","histSelect","akSelect"]) { const s=document.getElementById(id); s.value=value; s.dispatchEvent(new Event("change")); } }');
    await waitFor(`${chartCount(16)} && ${idle}`);
    assert.deepEqual((await snapshot()).deficitChartM, shortRace.deficitChartM);
    assert.deepEqual((await snapshot()).histM, shortRace.histM);
    assert.deepEqual((await snapshot()).akBarsM, shortRace.akBarsM);
    console.log('PASS: rapid dropdown changes with delayed responses retain the final selection');

    await open('2025/stats/index.html?fail=geo', `${chartCount(14)} && ${idle}`);
    assert.equal(await evaluate('document.querySelectorAll(".load-error").length'), 7);
    console.log('PASS: missing geo data affects only its seven views; other 14 charts render');

    const html2026 = fs.readFileSync(path.join(root, '2026/stats/index.html'), 'utf8');
    const geoSource2026 = html2026.match(/data-geo-source="([^"]+)"/)?.[1] || './data/statistics.json';
    const geoPath2026 = path.resolve(root, '2026/stats', geoSource2026);
    const hasGeo2026 = fs.existsSync(geoPath2026);
    const nationalities2026 = JSON.parse(fs.readFileSync(path.join(root, '2026/stats/data/nationality.json'), 'utf8'));
    loaded = await open('2026/stats/index.html', `${chartCount(hasGeo2026 ? 8 : 6)} && ${idle}`);
    assert(!loaded.some(file => /_stats\.json$/.test(file)));
    assert(loaded.filter(file => file.endsWith('.json')).every(file => file.includes('/2026/stats/data/')));
    assert.equal(await evaluate('document.querySelectorAll(".tab-buttons label:not([hidden])").length'), 4);
    assert.equal(await evaluate('document.querySelectorAll("#nationalityTable tbody tr").length'), nationalities2026.length);
    assert.equal(await evaluate('[...document.querySelectorAll("#nationalityTable td.count")].reduce((sum,cell)=>sum+Number(cell.textContent.replaceAll(".","")),0)'), nationalities2026.reduce((sum, entry) => sum + entry.count, 0));
    if (hasGeo2026) {
        const geo2026 = JSON.parse(fs.readFileSync(geoPath2026, 'utf8'));
        assert.equal(await evaluate('document.querySelectorAll(".load-error").length'), 0);
        assert.equal(await evaluate('[...document.querySelectorAll("#federalStateTable td.count")].reduce((sum,cell)=>sum+Number(cell.textContent.replaceAll(".","")),0)'), geo2026.total_participants);
        assert.equal(await evaluate('[...document.querySelectorAll("#federalStateTable img")].every(img=>img.complete && img.naturalWidth > 0)'), true);
        assert.equal(loaded.filter(file => file.endsWith('.json')).length, 3);
    }
    console.log('PASS: 2026 uses only its own three data files and the first four tabs');

    await open('archive/2025/stats/dev.html', chartCount(17));
    for (const value of ['rothenhusen', 'finish', 'start']) {
        await evaluate(`document.getElementById('checkpointSelect').value='${value}'; document.getElementById('checkpointSelect').dispatchEvent(new Event('change'))`);
        await delay(150);
        assert.equal(await evaluate('Object.keys(Chart.instances).length'), 17);
        assert.equal(errors.length, 0, JSON.stringify(errors));
    }
    console.log('PASS: archived test page and all checkpoint dropdowns use the shared lifecycle');

    for (const year of ['2025', '2026']) {
        await open(`${year}/heatmap/index.html`, 'document.querySelector("#btnRes")?.disabled === false');
        assert.equal(await evaluate('document.getElementById("btnRes").click(); document.querySelector(".leaflet-hex7-pane").style.opacity'), '1');
        assert.equal(await evaluate('document.querySelector("[data-privacy-open]").click(); document.getElementById("privacyBox").style.display'), 'block');
        assert.equal(await evaluate('document.querySelector("[data-privacy-close]").click(); document.getElementById("privacyBox").style.display'), 'none');
        await open(`${year}/index.html`, `location.pathname.endsWith('/${year}/heatmap/index.html') && document.querySelector('#btnRes')?.disabled === false`);
    }
    console.log('PASS: both heatmaps, yearly redirects and privacy popups remain functional');
    console.log('Screenshot: ' + path.join(profile, 'stats-2025.png'));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    clearTimeout(deadline); socket?.close(); browser?.kill(); server.close();
});

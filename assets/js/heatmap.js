import "./privacy.js";
import { loadJson } from "./jsonLoader.js";

function showMapError(error) {
  console.error("Heatmap konnte nicht geladen werden", error);
  const message = document.createElement("p");
  message.className = "load-error map-error";
  message.setAttribute("role", "alert");
  message.textContent = "Die Kartendaten konnten nicht geladen werden. Bitte später erneut versuchen.";
  document.body.append(message);
}

let BUCKETS = [];

loadJson("./buckets.json")
  .then(data => {
    BUCKETS = data.buckets;
    return initMap();
  })
  .catch(showMapError);


/* ============================================================
   INIT MAP
   ============================================================ */
async function initMap() {
  const btnMapType = document.getElementById("btnMapType");
  const btnRes = document.getElementById("btnRes");

  const map = L.map("map", {
    preferCanvas: true,
    inertia: false,
    center: [53.699327, 10.774143],
    zoom: 9,
    attributionControl: true
  });

  /* ---------- Tile Panes ---------- */
  map.createPane("tilesDefault");
  map.getPane("tilesDefault").classList.add("tile-pane");
  map.createPane("tilesLight");
  map.getPane("tilesLight").classList.add("tile-pane");

  map.getPane("tilesDefault").style.zIndex = 200;
  map.getPane("tilesLight").style.zIndex = 201;

  map.getPane("tilesDefault").style.opacity = "1";
  map.getPane("tilesLight").style.opacity = "0";

const defaultMapTiles = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_4hu8_1_da0697d790ea9a146288d6b8",
  { 
    maxZoom: 19,
    pane: "tilesDefault",
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      '© <a href="https://carto.com/attributions">CARTO</a>'
  }
).addTo(map);

const lightMapTiles = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_4hu8_1_da0697d790ea9a146288d6b8",
  { 
    maxZoom: 19,
    pane: "tilesLight",
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      '© <a href="https://carto.com/attributions">CARTO</a>'
  }
).addTo(map);

  let currentBase = "default";


  /* ---------- Base Layer Fade Button ---------- */
  btnMapType.onclick = () => {
    if (currentBase === "default") {
      map.getPane("tilesDefault").style.opacity = "0";
      map.getPane("tilesLight").style.opacity = "1";
      currentBase = "light";
      btnMapType.textContent = "CARTO Voyager";
    } else {
      map.getPane("tilesDefault").style.opacity = "1";
      map.getPane("tilesLight").style.opacity = "0";
      currentBase = "default";
      btnMapType.textContent = "CARTO Light Grey";
    }
  };


  /* ---------- Hexagon Panes ---------- */
  map.createPane("hex6");
  map.createPane("hex7");

  map.getPane("hex6").classList.add("hex-pane");
  map.getPane("hex7").classList.add("hex-pane");

  map.getPane("hex6").style.zIndex = 410;
  map.getPane("hex7").style.zIndex = 420;

  map.getPane("hex6").style.opacity = "1";
  map.getPane("hex7").style.opacity = "0";

  let currentResolution = "r6";


  /* ---------- Color helper ---------- */
  const getColor = idx => BUCKETS[idx].color;
  const getLabel = idx => BUCKETS[idx].label;

  /* ============================================================
     LOAD HEX LAYERS (r6 & r7)
     ============================================================ */
  let layer6 = null;
  let layer7 = null;

function loadHex(file, pane, cb) {
  return loadJson(file)
    .then(data => {

      const geo = L.geoJSON(data, {
        pane,

        style: f => {
          const idx = f.properties.count_index;

          // ==== Adaptive Soft Border ====
          // Helle Zellen → etwas dunklerer Rand
          // Dunklere Zellen → etwas heller, damit es nicht absäuft
          const border =
            idx <= 1 ? "#c3b8a6" :
            idx === 2 ? "#b8ac9b" :
            idx === 3 ? "#aa9d8d" :
            idx === 4 ? "#a8958a" :
                        "#9a8279";
          
          return {
            fillColor: getColor(idx),
            color: border,
            weight: 0.75,
            fillOpacity: 0.38
          };
        },

        onEachFeature: (f, layer) => {
          layer.bindTooltip(
            "Anmeldungen: " + getLabel(f.properties.count_index),
            { sticky: true }
          );
        }
      });

      cb(geo);
    });
}

  const load6 = loadHex("hexagons_r6.geojson", "hex6", geo => {
    layer6 = geo;
    layer6.addTo(map);
    map.getPane("hex6").style.pointerEvents = "auto";
  });

  const load7 = loadHex("hexagons_r7.geojson", "hex7", geo => {
    layer7 = geo;
    layer7.addTo(map);
    map.getPane("hex7").style.pointerEvents = "none";
  });


  /* ============================================================
     RESOLUTION BUTTON WITH FADE + CORRECT TOOLTIP PANE
     ============================================================ */
  btnRes.onclick = () => {
    if (!layer6 || !layer7) return;

    if (currentResolution === "r6") {
      map.getPane("hex6").style.opacity = "0";
      map.getPane("hex7").style.opacity = "1";

      map.getPane("hex6").style.pointerEvents = "none";
      map.getPane("hex7").style.pointerEvents = "auto";

      currentResolution = "r7";
      btnRes.textContent = "Grobe Auflösung (r6)";
    } else {
      map.getPane("hex6").style.opacity = "1";
      map.getPane("hex7").style.opacity = "0";

      map.getPane("hex6").style.pointerEvents = "auto";
      map.getPane("hex7").style.pointerEvents = "none";

      currentResolution = "r6";
      btnRes.textContent = "Feine Auflösung (r7)";
    }
  };


  /* ============================================================
     LEGEND
     ============================================================ */
  const legend = L.control({ position:"bottomright" });

  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = "<b>Anmeldungen</b><br>";
    BUCKETS.forEach(b => {
      div.innerHTML += `<i style="background:${b.color}"></i>${b.label}<br>`;
    });
    return div;
  };
  legend.addTo(map);

  await Promise.all([load6, load7]);
  btnRes.disabled = false;
} // END initMap()

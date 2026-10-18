# Ratzeburger Adventslauf – Visualisierungen

Die produktiven Seiten verwenden für jedes Jahr dieselbe Struktur:

```text
assets/
  css/                     Gemeinsame Gestaltung
  js/
    heatmap.js             Start der Karte
    stats.js               Start der vorhandenen Statistiken
    stats/                 Diagramme, Tabellen und Datenloader
  img/flags/               Gemeinsame PNGs
archive/                   Alte Testseiten und ursprüngliche Testdaten
2025/
  index.html               Weiterleitung zur Heatmap
  heatmap/
    index.html
    buckets.json
    hexagons_r6.geojson
    hexagons_r7.geojson
  stats/
    index.html
    data/
      statistics.json
      age_buckets_by_distance.json
      nationality.json
      hauptlauf_stats.json
      kurzstrecke_stats.json
      time_buckets.json
2026/
  index.html               Weiterleitung zur Heatmap
  heatmap/                  Gleiche Struktur wie 2025
  stats/
    index.html             Reiter 1–4 aktiv, Ergebnisstatistiken auskommentiert
    data/
      statistics.json
      age_buckets_by_distance.json
      nationality.json
```

Ordner und Dateinamen sind für alle Jahre gleich. Zusätzliche Ergebnis- und
Checkpoint-Dateien sind nur in den Jahren vorhanden, für die diese Daten bereits
vorliegen. Die alten 2025er Teststände sind unter `archive/2025/` erhalten.

## Ein neues Jahr anlegen

1. Die Ordner `heatmap` und `stats` sowie die Weiterleitung `index.html` eines
   vorhandenen Jahres nach `YYYY/` kopieren.
2. JSON- und GeoJSON-Dateien durch die Daten des neuen Jahres ersetzen. Dateinamen
   und Feldstruktur beibehalten. Alte Jahresdaten nicht als neue Daten veröffentlichen.
3. In den beiden `index.html` Titel, Copyright, Ergebnislinks und gegebenenfalls
   Datenschutztexte anpassen. In der vorbereiteten Statistikseite für 2026 ist
   der Ergebnislink bewusst noch nicht eingetragen.
4. Gewünschte Auswertungen im HTML aktivieren oder auskommentieren. Die Verweise
   auf `../../assets/` bleiben unverändert.

JavaScript, CSS und lokale Bilder werden nur in `assets/` gepflegt. Die JSON-Dateien
werden relativ zur aufgerufenen Jahresseite geladen; gemeinsame PNGs relativ zum
JavaScript-Modul. Es wird kein Jahr aus einer URL herausgelesen oder fest im Code
eingetragen. Externe Nationalflaggen bleiben über die URLs in `nationality.json`
eingebunden. `buckets.json` gehört zu den Jahresdaten und muss zu den
`count_index`-Werten der GeoJSON-Dateien passen.

Die Statistikbereiche benötigen folgende Dateien in `YYYY/stats/data/`:

| Bereich | JSON-Dateien |
| --- | --- |
| Teilnehmer & Läufe, Altersstruktur | `age_buckets_by_distance.json` |
| Nationalität | `nationality.json` |
| Herkunftstabelle, Anreise & Herkunft | `statistics.json` |
| Rennstatus, Top 6, Zeiten-Histogramme, Altersklassen | `hauptlauf_stats.json`, `kurzstrecke_stats.json` |

Die Herkunftstabelle steht im Reiter „Nationalität“, verwendet aber die Geodaten.
Der Dateipfad kann pro Jahr am `<body>` festgelegt werden, zum Beispiel
`data-geo-source="./data/statistics.json"`. Ohne Angabe wird weiterhin
`./data/statistics.json` geladen. Dies gilt einheitlich für 2025 und 2026.
`time_buckets.json` wird nur von den zusätzlichen Checkpoint-Auswertungen der
Testseite verwendet.

## Statistikbereiche ausblenden

In der jeweiligen `stats/index.html` den vollständigen Bereich mit
`class="tab-content contentN"` auskommentieren. Innere HTML-Kommentare zuvor
entfernen, da HTML-Kommentare nicht verschachtelt werden dürfen. Der gemeinsame
Code blendet den zugehörigen Menüeintrag aus und wählt bei Bedarf einen anderen
verfügbaren Reiter. Alternativ können auch der Menüeintrag und der Radio-Button
mit auskommentiert werden.

Fehlende HTML-Elemente lösen keine Datenabfragen aus. Einzelne fehlgeschlagene
Auswertungen erhalten einen Hinweis; andere Bereiche bleiben nutzbar. Nur per CSS
versteckte Elemente sind weiterhin vorhanden und werden initialisiert.

Für 2026 sind die ersten vier Reiter aktiv: Teilnehmer & Läufe, Nationalität,
Altersstruktur sowie Anreise & Herkunft. Die Reiter 5–8 sind bis zum Vorliegen der
Ergebnisdaten auskommentiert. Zum Aktivieren die drei markierten Kommentare bei
Radio-Buttons, Menüeinträgen und Ergebnisbereichen entfernen. Es werden keine
Statistikdaten aus 2025 als Ersatz geladen.

## Auswertungen im HTML konfigurieren

Die Jahres-`index.html` bestimmt über `data-*`-Attribute, welche Auswertungen
gestartet werden. Neue Elemente mit diesen Attributen werden beim Seitenaufruf
automatisch erkannt. Die IDs der Diagramme und Tabellen sind frei wählbar; ihre
Position im HTML bestimmt die Anordnung innerhalb des vorhandenen Layouts.

Beispiel für einen Geschlechter-Donut:

```html
<div class="donut-box">
  <div class="chart-title">Hauptlauf</div>
  <div class="donut-chart-wrapper">
    <canvas data-chart="gender" data-section="Hauptlauf"></canvas>
  </div>
</div>
```

Unterstützte Diagramme:

| `data-chart` | Weitere Attribute |
| --- | --- |
| `gender` | `data-section="TOTAL"`, `"Hauptlauf"`, `"Kurzstrecke"` oder `"Kinderlauf"` |
| `age-pyramid` | `data-section`; die Höhe wird am umgebenden Element gesetzt |
| `distance-percentile`, `distance-histogram` | Keine |
| `finish-status` | `data-race` |
| `deficit` | `data-race`, `data-gender="M"` oder `"W"`; optional `data-limit` (Standard: 6) |
| `race-histogram` | `data-race`, `data-gender` |
| `age-groups` | `data-race`, `data-gender`, `data-metric` (z. B. `winner` oder `median`) |
| `checkpoint` | `data-checkpoint` (Feldname aus `time_buckets.json`) |

Für Tabellen gelten `data-table="nationality"`, `"federal-states"` oder `"top6"`.
`top6` benötigt zusätzlich `data-race`, `data-gender` und optional `data-limit`.

Ein Wert kann fest im HTML stehen oder aus einem Dropdown kommen. Statt
`data-race="hauptlauf"` wird dann `data-race-select="ID-des-Dropdowns"`
verwendet. Entsprechend gibt es `data-metric-select` und
`data-checkpoint-select`. Beispiel für die bestehende Streckenauswahl:

```html
<canvas data-chart="race-histogram"
        data-gender="M"
        data-race-select="histSelect"></canvas>
```

Ein zusätzliches Diagramm darf denselben Selektor verwenden; jede Canvas hat ihre
eigene Chart-Instanz. Für Kennzahlen aus `statistics.json`:

```html
<div class="geo-kpi-value"
     data-stat="distance_avg_km" data-digits="1" data-unit="km"></div>
```

Mit `data-format="distance"` wird eine Entfernung unter 1 km automatisch in
ganzen Metern angezeigt; ab 1 km gelten Kilometer mit `data-digits`
Nachkommastellen. Beide Jahresseiten nutzen dies für die minimale Entfernung.

Die vorhandenen Layout-Container und CSS-Klassen bleiben erforderlich. Die
HTML-Attribute legen fest, welche Auswertung innerhalb eines Containers erscheint.
Die bisherigen direkten JavaScript-Aufrufe der Testseite bleiben nutzbar.

## Gemeinsame Diagrammhilfen

Unter `assets/js/stats/` werden folgende Funktionen zentral gepflegt:

- `chartTheme.js`: Geschlechter-, Lauf- und Statusfarben.
- `format.js`: Deutsche Zahlen und Prozente, Zeiten und Checkpoint-Zeitstempel
  in der Zeitzone der Veranstaltung.
- `chartLifecycle.js`: Vorhandene Chart-Instanz je Canvas ersetzen oder entfernen.
- `donutChart.js`: Donut-Darstellung mit gemeinsamem Text und Tooltip.
- `kde.js`: Glättung und Skalierung der Histogrammlinien, auch bei leeren Daten.
- `checkpointHistograms.js`: Gemeinsame Checkpoint-Auswertung. Die Dateien
  `startHistogram.js`, `rothenhusenHistogram.js` und `finishHistogram.js` erhalten
  die bisherigen Einstiegspunkte für die Testseite.

## Geostatistik aus einer verarbeiteten CSV erzeugen

Vom Projektverzeichnis aus:

```powershell
node scripts/build-statistics.cjs "..\AddressToHexagonMap\processed_data\adventslauf_2026.csv" "2026/stats/data/statistics.json"
```

Der Import liest die verarbeitete CSV mit den Spalten `origin`, `country`,
`federal_state_germany`, `lat`, `lon` und `status`. Er erzeugt ausschließlich
aggregierte Daten. Straßen, individuelle Koordinaten und Suchadressen werden
nicht in die JSON-Datei übernommen. Quell-Dateiname und SHA-256-Prüfsumme halten
fest, aus welcher CSV der Export erzeugt wurde.

Die Luftlinie wird aus gültigen Koordinaten mit Status `OK` zum Marktplatz
Ratzeburg (53.699283, 10.774161) neu berechnet. Die vorhandene `distance`-Spalte
wird ignoriert, da ihre Dezimaldarstellung im vorliegenden Export uneinheitlich
ist. Ausgeschlossen werden fehlende oder ungültige Koordinaten; sie werden nicht
als 0 km gerechnet. `total_participants`, `distance_participants` und
`distance_missing` machen den Umfang der Berechnung sichtbar.

Die Datei enthält Minimum, Maximum, Mittelwert, Median, Perzentile von 0 bis
100, Entfernungsgruppen, Histogramm und Bundesland-Anzahlen. Entfernungen werden
erst bei der Ausgabe gerundet: das Minimum auf drei Nachkommastellen
(metergenau), die übrigen Kennzahlen auf zwei. Perzentile verwenden
lineare Interpolation, Histogramm-Intervalle schließen die untere Grenze ein und
die obere aus; die letzte obere Grenze ist eingeschlossen.

Fehlende Bundesländer werden bei eindeutigen Stadtstaat-Namen in `origin`
ergänzt, einschließlich einer vorangestellten PLZ. Diese Ergänzung erfordert
Status `OK`. PLZ ohne Ortsnamen werden nicht geraten. Übrige Fälle erscheinen
unter `[XX] Unbekannt` mit der Fragezeichen-Flagge. Die Bundesländer sind nach
Anzahl sortiert; danach folgen „Ausland“ und zuletzt „Unbekannt“, jeweils außerhalb
der Sortierung. `metadata` weist die
Anzahl der Ergänzungen und die noch nicht zugeordneten geocodierten Einträge aus.

`international_participants` enthält nur die Gesamtzahl ausländischer
Meldeadressen. Der Tabellenrenderer unterstützt diese Zahl und für ältere Jahre
weiterhin `land_buckets`. Die neue Datei benötigt keine Länder-, Kreis-,
Windrichtungs- oder Top-Hexagon-Auswertung. Nationalität und Meldeadresse sind
unterschiedliche Merkmale und werden getrennt gezählt.

Der CSV-Stand für diesen Export enthält 3.026 Einträge; die vorhandene
Nationalitätstabelle von 2026 enthält dagegen 3.031. Diese Datenstände werden
nicht künstlich angeglichen.

## Prüfungen

Mit Node.js 22 oder neuer (hier mit Node.js 24 geprüft):

```powershell
node --test tests/stats.test.mjs tests/statistics.test.mjs
node tests/browser.cjs
```

Die Browserprüfung verwendet einen unsichtbaren Chromium-Browser und einen
temporären HTTP-Server auf localhost. Unter Windows wird Edge oder Chrome
automatisch gefunden; alternativ über `$env:BROWSER_PATH` den Browserpfad setzen.
Für Chart.js und Leaflet wird Internetzugriff auf deren bisherige CDNs benötigt.

Sie vergleicht die Diagrammdaten von 2025 mit `HEAD` und prüft beide Jahresseiten,
die archivierte Testseite, freie Diagramm-IDs, zusätzliche Diagramme, fehlende Bereiche und
Daten sowie schnelle Dropdown-Wechsel. Die Glättungslinien werden mit Toleranz
für Gleitkomma-Rundung verglichen. JSON- und GeoJSON-Dateien werden dabei nicht
verändert.

## Veröffentlichung und Vorschau

Den gemeinsamen Ordner `assets/` und die gewünschten Jahresordner zusammen auf
denselben Webserver hochladen. Relative Pfade funktionieren auch unter einem
Unterverzeichnis, etwa auf GitHub Pages. Die Seiten über HTTP(S) öffnen;
`file://` unterstützt das Laden der Module und JSON-Daten nicht zuverlässig.

`YYYY/index.html` leitet auf `YYYY/heatmap/index.html` weiter. Testseiten und ihre
alten Datenstände liegen unter `archive/2025/`; dort sind auch ihre Daten- und
Modulverweise dokumentiert. Für die produktiven Seiten werden nur `assets/` und
die gewünschten Jahresordner benötigt.

Änderungen an `assets/` wirken auf alle Jahre. Vor der Veröffentlichung deshalb
Karte und Statistik auch mit älteren Jahresdaten prüfen. Browser-Caches können
noch ältere Asset-Versionen enthalten; bei der Prüfung gegebenenfalls neu laden.

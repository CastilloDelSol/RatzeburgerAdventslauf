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
2025/
  heatmap/
    index.html
    buckets.json
    hexagons_r6.geojson
    hexagons_r7.geojson
  stats/
    index.html
    data/*.json
2026/
  heatmap/                  Gleiche Struktur wie 2025
  stats/
    index.html             Vorbereitet, Auswertungen noch auskommentiert
    data/                  Hier später die Statistikdaten für 2026 ablegen
```

## Ein neues Jahr anlegen

1. Die Ordner `heatmap` und `stats` eines vorhandenen Jahres nach `YYYY/` kopieren.
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
| Herkunftstabelle, Anreise & Herkunft | `geo-stats.json` |
| Rennstatus, Top 6, Zeiten-Histogramme, Altersklassen | `hauptlauf_stats.json`, `kurzstrecke_stats.json` |

Die Herkunftstabelle steht im Reiter „Nationalität“, verwendet aber die Geodaten.
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

Für 2026 sind alle acht produktiven Statistikbereiche als ein zusammenhängender
Kommentar vorbereitet. Sobald Daten vorliegen, den äußeren Kommentar entfernen,
nicht benötigte Bereiche auskommentieren und den Verfügbarkeitshinweis entfernen.
Es werden keine Statistikdaten aus 2025 als Ersatz geladen.

## Veröffentlichung und Vorschau

Den gemeinsamen Ordner `assets/` und die gewünschten Jahresordner zusammen auf
denselben Webserver hochladen. Relative Pfade funktionieren auch unter einem
Unterverzeichnis, etwa auf GitHub Pages. Die Seiten über HTTP(S) öffnen;
`file://` unterstützt das Laden der Module und JSON-Daten nicht zuverlässig.

`2025/index.html` leitet für bisherige Links auf `2025/heatmap/index.html` weiter.
Andere HTML-Dateien sind Testseiten. Deren bestehende Importe wurden, soweit von
der Verschiebung betroffen, auf den gemeinsamen Ordner umgestellt. Die produktiven
Seiten enthalten ausschließlich den Funktionsumfang der bisherigen `index.html`.

Änderungen an `assets/` wirken auf alle Jahre. Vor der Veröffentlichung deshalb
Karte und Statistik auch mit älteren Jahresdaten prüfen. Browser-Caches können
noch ältere Asset-Versionen enthalten; bei der Prüfung gegebenenfalls neu laden.

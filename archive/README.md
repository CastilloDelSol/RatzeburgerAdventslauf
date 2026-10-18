# Archivierte Teststände

`2025/` enthält die bisherigen Prototypen und Testdaten. Die relative Struktur
innerhalb des Archivs bleibt erhalten. Diese Dateien gehören nicht zu den
produktiven Jahresordnern.

- `2025/stats.html`, `stats_dev.html` und `ak_pyramide.html` verwenden ihre
  ursprünglichen JSON-Teststände im selben Ordner.
- `2025/dev.html` verwendet per HTML-`base` die produktiven Heatmap-Daten aus
  `/2025/heatmap/`.
- `2025/stats/dev.html` verwendet per HTML-`base` die gemeinsamen Module und
  produktiven Daten aus `/2025/stats/data/`, einschließlich `statistics.json`.
- `2025/stats/parent.html` bettet die daneben liegende archivierte Testseite ein.
- `2025/stats/strato.html` enthält ein Einbettungsbeispiel für die produktive
  Statistikseite auf GitHub Pages.

Die produktiven Einstiege sind ausschließlich `/YYYY/heatmap/index.html` und
`/YYYY/stats/index.html`. `/YYYY/index.html` leitet zur jeweiligen Heatmap weiter.

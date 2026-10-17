import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * Re-tint any OpenMapTiles-schema basemap into the bright "Sunny Lake" palette at
 * runtime (sky-blue water, cream land, soft-green parks). Matching on layer ids
 * keeps the tile provider swappable via VITE_MAP_STYLE_URL.
 */
export function applyMarineTheme(map: MapLibreMap) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#fbf6ec");
      } else if (layer.type === "fill") {
        if (id.includes("water")) {
          map.setPaintProperty(layer.id, "fill-color", "#9fdcff");
          map.setPaintProperty(layer.id, "fill-opacity", 1);
        } else if (/(park|wood|grass|forest|national|landcover)/.test(id)) {
          map.setPaintProperty(layer.id, "fill-color", "#d9f2cf");
          map.setPaintProperty(layer.id, "fill-opacity", 0.75);
        } else if (id.includes("residential") || id.includes("landuse")) {
          map.setPaintProperty(layer.id, "fill-color", "#f6efe2");
        } else if (id.includes("building")) {
          map.setPaintProperty(layer.id, "fill-color", "#efe6d6");
        }
      } else if (layer.type === "line") {
        if (id.includes("water") || id.includes("river") || id.includes("stream")) {
          map.setPaintProperty(layer.id, "line-color", "#8fd3ff");
        } else if (id.includes("casing")) {
          map.setPaintProperty(layer.id, "line-color", "#eadfcb");
        } else if (/(road|highway|street|path|transport|bridge|tunnel)/.test(id)) {
          map.setPaintProperty(layer.id, "line-color", "#ffffff");
        } else if (id.includes("boundary")) {
          map.setPaintProperty(layer.id, "line-color", "#d4c7f5");
        }
      } else if (layer.type === "symbol") {
        const isWaterLabel = id.includes("water") || id.includes("lake") || id.includes("marine");
        map.setPaintProperty(layer.id, "text-color", isWaterLabel ? "#2a8fd6" : "#7d879b");
        map.setPaintProperty(layer.id, "text-halo-color", isWaterLabel ? "#d6f0ff" : "#fffaf2");
        map.setPaintProperty(layer.id, "text-halo-width", 1.5);
      }
    } catch {
      /* layer doesn't support that paint property — skip */
    }
  }
}

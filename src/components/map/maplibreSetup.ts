import { setWorkerUrl } from "maplibre-gl";
// MapLibre v6 ships its worker as a separate self-contained ES module. Vite pre-bundles
// the main library (breaking its import.meta.url lookup), so point it at the file explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

setWorkerUrl(workerUrl);

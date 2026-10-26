import type { UnitMode } from "../../astro/units"
import type { LabelMode } from "../../state/app-state"

interface UnitText {
  /** Short label after a number and on the toolbar. */
  label: string
  /** Longer name for tooltips. */
  name: string
}

// The source of truth: every other locale must provide the same shape (see Messages).
export const en = {
  /** Static text of index.html, looked up through its data-i18n* attributes. */
  page: {
    title: "Solar Neighborhood 3D Star Map",
    kicker: "SOLAR NEIGHBORHOOD · INTERACTIVE ATLAS",
    heading: "The Solar Neighborhood<br />in 3D, 100 Light-Years Across",
    subtitle:
      "A cube centered on the Sun, drawn in galactic coordinates<br />with an optional celestial equator overlay",
    starCountCaption: "Stars and systems shown",
    cubeEdgeCaption: "Cube edge length",
    currentObserver: "Current observer",
    returnSun: "☉ Back to the Sun",
    returnSunTitle: "Move the observer back to the Sun",
    viewFromSirius: "View from Sirius",
    viewFromProxima: "View from Proxima",
    observerExplain:
      'Select a star and press "Observe from this star", or double-click it, to move the distances, the star list and the cube origin there. The axes keep their orientation.',
    retry: "↻ Retry",
    maxDistance: "Max distance",
    maxDistanceAria: "Maximum distance from the observer",
    catalogNote:
      "Includes the stars of HYG v4.1 within about 173 ly of the Sun (about 9,600 entries), so nearby stars still show up after you move the observer. Stars missing from the catalog are not shown.",
    guideTitle: "Coordinates and the galactic plane",
    guideBody:
      "The XYZ axes follow galactic coordinates: the XY plane is the galactic plane (latitude b = 0°) and the Z axis points to the north galactic pole. Turn on the celestial equator to compare the same stars against the J2000 equator (δ = 0°) and the north celestial pole, which is tilted about 63° from the galactic pole.",
    keyGalacticPlane: "Galactic plane",
    keyGalacticCenter: "Galactic center",
    keyNorthGalacticPole: "North galactic pole",
    keyCelestialEquator: "Celestial equator",
    keyNorthCelestialPole: "North celestial pole",
    searchPlaceholder: "Search stars (e.g. Sirius)",
    searchAria: "Search stars by name, designation or catalog ID",
    starsHeading: "Stars",
    starListAria: "Star list. The selected star is cyan and the observer is gold",
    source:
      '"View from another star" is a geometric comparison of distances between stars. It reflects parallax but not light travel time, proper motion or how bright the sky would really look.<br />Positions and distances: <a href="https://github.com/astronexus/HYG-Database" target="_blank" rel="noopener">HYG v4.1 (David Nash, CC BY-SA 4.0)</a>, processed (stars within about 173 ly of the Sun, with Japanese names added for major stars). The processed data is also provided under CC BY-SA 4.0. Galactic coordinate transform: <a href="https://gea.esac.esa.int/archive/documentation/GDR3/Data_processing/chap_cu3ast/sec_cu3ast_intro/ssec_cu3ast_intro_tansforms.html" target="_blank" rel="noopener">ESA Gaia DR3</a>. HYG does not cover every star, and star sizes are schematic.',
    equatorTitle: "Show or hide the celestial equator (δ = 0°)",
    labelsTitle: "Cycle labels: major, all, none",
    grid: "Grid",
    gridTitle: "Show or hide the grid",
    galacticTitle: "Show or hide the galactic plane (b = 0°)",
    topDownView: "↗ Top-down view",
    topDownViewTitle: "Look down on the galactic plane from the north galactic pole",
    resetView: "↺ Reset view",
    resetViewTitle: "Reset the view and return to the Sun (R)",
    instructions:
      "Drag: rotate / Wheel: zoom / Click a star: details<br />Double-click a star: observe from it / R: reset view",
  },
  units: {
    ly: { label: "ly", name: "light-years" },
    pc: { label: "pc", name: "parsecs" },
    mau: { label: "MAU", name: "mega astronomical units" },
  } as Record<UnitMode, UnitText>,
  /** Name of the placeholder Sun shown until the catalog loads. */
  sun: "Sun",
  toolbar: {
    celestialEquator: (on: boolean): string => `Celestial equator: ${on ? "ON" : "OFF"}`,
    galacticPlane: (on: boolean): string => `Galactic plane: ${on ? "ON" : "OFF"}`,
    units: (label: string): string => `Units: ${label}`,
    unitsTitle: (name: string): string => `Switch the distance unit (now: ${name})`,
    labels: {
      major: "Labels: Major",
      all: "Labels: All",
      none: "Labels: None",
    } as Record<LabelMode, string>,
    legendFrame: "GALACTIC COORDINATES",
    legendGalacticPlane: "GALACTIC PLANE (b=0°)",
    legendCelestialEquator: "CELESTIAL EQUATOR (δ=0°)",
    legendUnits: (label: string): string => `UNITS: ${label}`,
    axisHint: "X: galactic center (l = 0°) · Y: l = 90° · Z: north galactic pole (b = +90°)",
    planeHint: (label: string): string =>
      `Galactic plane: b = 0° / Galactic center: l = 0° / Distances in ${label}`,
  },
  dataPanel: {
    loading: "Loading star catalog…",
    loadFailed: (reason: string): string => `Could not load the star catalog: ${reason}`,
    catalog: "Catalog",
    ready: (source: string, count: string, observer: string, maxDistance: string): string =>
      `${source}: ${count} stars shown / observer: ${observer} / max distance ${maxDistance}`,
  },
  detail: {
    empty: "No stars to show",
    currentObserver: "current observer",
    observingFromHere: "Observing from this star",
    outOfRange: (limit: string): string => `Out of range (over ${limit} from the Sun)`,
    observeFromHere: "✧ Observe from this star",
    distanceFrom: (name: string): string => `Distance from ${name}`,
    distanceFromSun: "Distance from the Sun",
    galacticLongitude: "Galactic longitude l (from the Sun)",
    galacticLatitude: "Galactic latitude b (from the Sun)",
    rightAscension: "Right ascension (J2000, from the Sun)",
    declination: "Declination (J2000, from the Sun)",
    spectralType: "Spectral type (approx.)",
    designations: "Designations",
    catalogIds: "Catalog IDs",
    apparentMagnitude: "Apparent magnitude (from Earth)",
    openWikipedia: "Open the Wikipedia article in a new tab",
    noWikipediaArticle: "No Wikipedia article",
  },
  starList: {
    selectedSuffix: " (selected)",
    observerSuffix: " (observer)",
    selectedMark: "✦ Selected",
    pinnedBeyondLimit: (limit: string): string => `✦ Selected (beyond the first ${limit})`,
    pinnedNotInResults: "✦ Selected (not in the search results)",
    noMatches: "No matching stars",
    more: (count: string): string =>
      `${count} more. Narrow down by name, designation or catalog ID.`,
    sortLabel: (unit: string): string => `By distance from the observer (${unit})`,
    selectedNote: "✦ Selected:",
    observerNote: "◎ Observer:",
  },
  tooltip: {
    distanceFromHere: (distance: string): string => `${distance} from here`,
  },
  canvas: {
    ariaLabel: "3D map of nearby stars, drag to rotate",
    galacticCenter: "Galactic center · l=0°",
    northGalacticPole: "North galactic pole · b=+90°",
    galacticPlane: "Galactic plane · b=0°",
    northCelestialPole: "North celestial pole (toward Polaris) · δ=+90°",
    celestialEquator: "Celestial equator · δ=0°",
  },
}

export type Messages = typeof en
export type PageKey = keyof Messages["page"]

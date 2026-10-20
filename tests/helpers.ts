import { equatorialToGalactic, galacticToEquatorial } from "../src/astro/coordinates"
import type { Star, Vec3 } from "../src/catalog/types"

export function makeStar(id: string, eq: Vec3, overrides: Partial<Star> = {}): Star {
  return {
    id,
    name: id,
    nameJa: id,
    catalogLabel: "",
    distLy: Math.hypot(...eq),
    raH: 0,
    decDeg: 0,
    spec: "G",
    mag: null,
    priority: 0,
    color: "#ffffff",
    eq,
    gal: equatorialToGalactic(eq),
    l: null,
    b: null,
    ...overrides,
  }
}

export function makeStarFromGal(id: string, gal: Vec3, overrides: Partial<Star> = {}): Star {
  return makeStar(id, galacticToEquatorial(gal), { gal, ...overrides })
}

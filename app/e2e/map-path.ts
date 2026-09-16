/**
 * The shared map path: one checked-in definition of the journey that both the
 * benchmark script and the differential smoke test drive, so they cannot drift apart.
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1, docs/benchmarks/map-migration-method.md);
 * see ADR-0027 and docs/tickets/map-migration/PRD.md (Testing Decisions, seam 5).
 *
 * This module has no Playwright dependency so jest can test it directly.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const MAP_PATH_FILE = resolve(__dirname, 'map-path.json');
export const MAP_PATH_FORMAT_VERSION = 1;

/** The zoom range the map allows today (Leaflet minZoom / maxZoom in map.tsx). */
const MIN_ZOOM = 7;
const MAX_ZOOM = 19;

export interface LatLng {
    lat: number;
    lng: number;
}

export interface PathStart {
    /** Site-relative route the path opens first, for example `/view/location`. */
    path: string;
    position: LatLng;
    zoom: number;
}

export interface NamedPlace {
    name: string;
    position: LatLng;
    /** The zoom the map is at when the pan to this place happens. */
    zoom: number;
}

export interface CategorySwitch {
    name: string;
    /** Sidebar category slug (`categoriesConfig[...].slug`). */
    categorySlug: string;
    /** Tileset the map shows after the switch (`BuildingMapTileset`). */
    tileset: string;
}

export interface MapPath {
    formatVersion: number;
    start: PathStart;
    places: [NamedPlace, NamedPlace];
    zoomSteps: { from: number; to: number };
    categorySwitches: [CategorySwitch, CategorySwitch];
    building: { name: string; position: LatLng };
}

export class MapPathError extends Error {
    constructor(message: string) {
        super(`Map path file is invalid: ${message}`);
        this.name = 'MapPathError';
    }
}

/**
 * Validates the raw JSON shape and returns a typed path. Throws MapPathError with the
 * offending field named, so a changed or broken file fails loudly rather than
 * producing a benchmark of a different journey.
 */
export function parseMapPath(raw: unknown): MapPath {
    const root = expectObject(raw, 'root');
    if (root.format_version !== MAP_PATH_FORMAT_VERSION) {
        throw new MapPathError(`format_version must be ${MAP_PATH_FORMAT_VERSION}, got ${JSON.stringify(root.format_version)}`);
    }

    const start = expectObject(root.start, 'start');
    const startPath = expectString(start.path, 'start.path');
    if (!startPath.startsWith('/')) {
        throw new MapPathError('start.path must be site-relative and begin with "/"');
    }

    const places = expectArray(root.places, 'places', 2).map((place, i) => {
        const item = expectObject(place, `places[${i}]`);
        return {
            name: expectString(item.name, `places[${i}].name`),
            position: expectPosition(item.position, `places[${i}].position`),
            zoom: expectZoom(item.zoom, `places[${i}].zoom`)
        };
    }) as [NamedPlace, NamedPlace];

    const zoomSteps = expectObject(root.zoom_steps, 'zoom_steps');
    const from = expectZoom(zoomSteps.from, 'zoom_steps.from');
    const to = expectZoom(zoomSteps.to, 'zoom_steps.to');
    if (from >= to) {
        throw new MapPathError(`zoom_steps.from (${from}) must be below zoom_steps.to (${to})`);
    }

    const parsed: MapPath = {
        formatVersion: MAP_PATH_FORMAT_VERSION,
        start: {
            path: startPath,
            position: expectPosition(start.position, 'start.position'),
            zoom: expectZoom(start.zoom, 'start.zoom')
        },
        places,
        zoomSteps: { from, to },
        categorySwitches: expectArray(root.category_switches, 'category_switches', 2).map((entry, i) => {
            const item = expectObject(entry, `category_switches[${i}]`);
            return {
                name: expectString(item.name, `category_switches[${i}].name`),
                categorySlug: expectString(item.category_slug, `category_switches[${i}].category_slug`),
                tileset: expectString(item.tileset, `category_switches[${i}].tileset`)
            };
        }) as [CategorySwitch, CategorySwitch],
        building: (() => {
            const building = expectObject(root.building, 'building');
            return {
                name: expectString(building.name, 'building.name'),
                position: expectPosition(building.position, 'building.position')
            };
        })()
    };

    // The journey is: pan to place 1 at the start zoom, zoom out to zoom_steps.from,
    // pan to place 2, then step up to zoom_steps.to. The file must say the same.
    if (parsed.places[0].zoom !== parsed.start.zoom) {
        throw new MapPathError(`places[0].zoom (${parsed.places[0].zoom}) must equal start.zoom (${parsed.start.zoom})`);
    }
    if (parsed.places[1].zoom !== from) {
        throw new MapPathError(`places[1].zoom (${parsed.places[1].zoom}) must equal zoom_steps.from (${from})`);
    }
    if (parsed.categorySwitches[0].categorySlug === parsed.categorySwitches[1].categorySlug) {
        throw new MapPathError('the two category switches must open different categories');
    }

    return parsed;
}

/** Reads and validates the checked-in path file (or another file, for tests). */
export function loadMapPath(filePath: string = MAP_PATH_FILE): MapPath {
    let text: string;
    try {
        text = readFileSync(filePath, 'utf8');
    } catch (error) {
        throw new MapPathError(`cannot read ${filePath}: ${(error as Error).message}`);
    }
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch (error) {
        throw new MapPathError(`${filePath} is not valid JSON: ${(error as Error).message}`);
    }
    return parseMapPath(raw);
}

function expectObject(value: unknown, field: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new MapPathError(`${field} must be an object`);
    }
    return value as Record<string, unknown>;
}

function expectString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new MapPathError(`${field} must be a non-empty string`);
    }
    return value;
}

function expectArray(value: unknown, field: string, length: number): unknown[] {
    if (!Array.isArray(value) || value.length !== length) {
        throw new MapPathError(`${field} must be an array of exactly ${length} entries`);
    }
    return value;
}

function expectZoom(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < MIN_ZOOM || value > MAX_ZOOM) {
        throw new MapPathError(`${field} must be an integer zoom between ${MIN_ZOOM} and ${MAX_ZOOM}`);
    }
    return value;
}

function expectPosition(value: unknown, field: string): LatLng {
    if (!Array.isArray(value) || value.length !== 2 || value.some(v => typeof v !== 'number' || !Number.isFinite(v))) {
        throw new MapPathError(`${field} must be [latitude, longitude]`);
    }
    const [lat, lng] = value as [number, number];
    if (Math.abs(lat) > 85.0511 || Math.abs(lng) > 180) {
        throw new MapPathError(`${field} is outside the Web Mercator world`);
    }
    return { lat, lng };
}

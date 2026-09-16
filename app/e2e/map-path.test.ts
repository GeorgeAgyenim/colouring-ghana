/**
 * @jest-environment node
 */
import ccConfig from '../src/cc-config.json';
import { loadMapPath, parseMapPath, MapPathError, MAP_PATH_FILE } from './map-path';

function validRaw() {
    return {
        format_version: 1,
        start: { path: '/view/location', position: [6.67137, -1.53958], zoom: 16 },
        places: [
            { name: 'Place one', position: [6.676, -1.556], zoom: 16 },
            { name: 'Place two', position: [6.6751426, -1.5730008], zoom: 12 }
        ],
        zoom_steps: { from: 12, to: 19 },
        category_switches: [
            { name: 'age', category_slug: 'age-history', tileset: 'date_year' },
            { name: 'construction material', category_slug: 'construction-design', tileset: 'construction_core_material' }
        ],
        building: { name: 'A building', position: [6.6751426, -1.5730008] }
    };
}

describe('parseMapPath', () => {
    it('returns a typed path for a valid file', () => {
        const path = parseMapPath(validRaw());
        expect(path.start).toEqual({ path: '/view/location', position: { lat: 6.67137, lng: -1.53958 }, zoom: 16 });
        expect(path.places[1].name).toBe('Place two');
        expect(path.zoomSteps).toEqual({ from: 12, to: 19 });
        expect(path.categorySwitches[1].categorySlug).toBe('construction-design');
        expect(path.building.position).toEqual({ lat: 6.6751426, lng: -1.5730008 });
    });

    it('rejects a different format version', () => {
        expect(() => parseMapPath({ ...validRaw(), format_version: 2 })).toThrow(MapPathError);
        expect(() => parseMapPath({ ...validRaw(), format_version: 2 })).toThrow(/format_version/);
    });

    it('names the missing or malformed field', () => {
        const raw = validRaw();
        delete (raw.start as Partial<typeof raw.start>).position;
        expect(() => parseMapPath(raw)).toThrow(/start\.position/);

        const badZoom = validRaw();
        badZoom.zoom_steps.to = 25;
        expect(() => parseMapPath(badZoom)).toThrow(/zoom_steps\.to/);

        const badPlaces = validRaw();
        badPlaces.places.pop();
        expect(() => parseMapPath(badPlaces)).toThrow(/places must be an array of exactly 2/);
    });

    it('rejects a journey whose zooms disagree with the zoom steps', () => {
        const raw = validRaw();
        raw.places[1].zoom = 13;
        expect(() => parseMapPath(raw)).toThrow(/places\[1\]\.zoom/);
    });

    it('rejects zoom steps that do not ascend', () => {
        const raw = validRaw();
        raw.zoom_steps = { from: 19, to: 12 };
        raw.places[1].zoom = 19;
        expect(() => parseMapPath(raw)).toThrow(/zoom_steps\.from/);
    });

    it('rejects two switches to the same category', () => {
        const raw = validRaw();
        raw.category_switches[1].category_slug = 'age-history';
        expect(() => parseMapPath(raw)).toThrow(/different categories/);
    });
});

describe('loadMapPath', () => {
    it('loads the checked-in path file and it is valid', () => {
        const path = loadMapPath();
        expect(path.formatVersion).toBe(1);
        expect(path.start.path).toBe('/view/location');
        expect(path.zoomSteps).toEqual({ from: 12, to: 19 });
        expect(path.categorySwitches.map(s => s.categorySlug)).toEqual(['age-history', 'construction-design']);
    });

    it('starts at the site\'s initial viewport from cc-config.json (method v1, step 1)', () => {
        const path = loadMapPath();
        expect(path.start.position).toEqual({ lat: ccConfig.initialMapPosition[0], lng: ccConfig.initialMapPosition[1] });
        expect(path.start.zoom).toBe(ccConfig.initialZoomLevel);
    });

    it('fails clearly when the file is missing', () => {
        expect(() => loadMapPath(MAP_PATH_FILE + '.missing')).toThrow(/cannot read/);
    });
});

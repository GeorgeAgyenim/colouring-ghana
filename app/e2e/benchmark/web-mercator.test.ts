/**
 * @jest-environment node
 */
import { pixelOffset, projectToPixel, splitIntoDrags } from './web-mercator';

describe('projectToPixel', () => {
    it('puts the origin at the centre of the single zoom-0 tile', () => {
        const p = projectToPixel({ lat: 0, lng: 0 }, 0);
        expect(p.x).toBeCloseTo(128, 6);
        expect(p.y).toBeCloseTo(128, 6);
    });

    it('scales by a factor of two per zoom level', () => {
        const p = projectToPixel({ lat: 0, lng: 0 }, 3);
        expect(p.x).toBeCloseTo(1024, 6);
        expect(p.y).toBeCloseTo(1024, 6);
    });

    it('maps the Mercator limits to the tile edges', () => {
        const corner = projectToPixel({ lat: 85.0511287798, lng: -180 }, 0);
        expect(corner.x).toBeCloseTo(0, 6);
        expect(corner.y).toBeCloseTo(0, 3);
    });
});

describe('pixelOffset', () => {
    it('is positive x eastwards and positive y southwards', () => {
        const offset = pixelOffset({ lat: 6.67137, lng: -1.53958 }, { lat: 6.676, lng: -1.556 }, 16);
        expect(offset.x).toBeLessThan(0);
        expect(offset.y).toBeLessThan(0);
        // About 1.8 km west at roughly 2.4 m per pixel.
        expect(Math.abs(offset.x)).toBeGreaterThan(700);
        expect(Math.abs(offset.x)).toBeLessThan(800);
    });
});

describe('splitIntoDrags', () => {
    it('keeps a short offset as one drag', () => {
        expect(splitIntoDrags({ x: 100, y: -40 }, 400)).toEqual([{ x: 100, y: -40 }]);
    });

    it('splits a long offset into drags within the limit that sum to the whole', () => {
        const drags = splitIntoDrags({ x: -765.4, y: -212.2 }, 400);
        expect(drags).toHaveLength(2);
        for (const drag of drags) {
            expect(Math.abs(drag.x)).toBeLessThanOrEqual(400);
            expect(Math.abs(drag.y)).toBeLessThanOrEqual(400);
        }
        const sum = drags.reduce((acc, d) => ({ x: acc.x + d.x, y: acc.y + d.y }), { x: 0, y: 0 });
        expect(sum).toEqual({ x: -765, y: -212 });
    });

    it('returns one zero drag for a zero offset', () => {
        expect(splitIntoDrags({ x: 0, y: 0 }, 400)).toEqual([{ x: 0, y: 0 }]);
    });
});

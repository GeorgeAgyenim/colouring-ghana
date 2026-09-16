/**
 * Web Mercator pixel maths, matching Leaflet's default CRS (EPSG:3857, 256-pixel tiles),
 * so the benchmark can turn "pan to this place" into an exact pixel drag and "click this
 * building" into an exact viewport point without a handle on the map object.
 *
 * Implements NFR-1.4, NFR-1.5 (benchmark method v1); see docs/tickets/map-migration/PRD.md seam 5.
 */
import { LatLng } from '../map-path';

const TILE_SIZE = 256;

export interface PixelPoint {
    x: number;
    y: number;
}

/** World pixel coordinates of a position at a zoom level (origin top-left, y down). */
export function projectToPixel(position: LatLng, zoom: number): PixelPoint {
    const scale = TILE_SIZE * Math.pow(2, zoom);
    const latRadians = position.lat * Math.PI / 180;
    const x = (position.lng + 180) / 360 * scale;
    const y = (1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2 * scale;
    return { x, y };
}

/** Pixel offset from one position to another at a zoom level (`to` minus `from`). */
export function pixelOffset(from: LatLng, to: LatLng, zoom: number): PixelPoint {
    const a = projectToPixel(from, zoom);
    const b = projectToPixel(to, zoom);
    return { x: b.x - a.x, y: b.y - a.y };
}

/**
 * Splits a pixel offset into whole-pixel drags no longer than `maxPerAxis` on either axis,
 * so a long pan is several short drags that all stay inside the viewport. The drags sum
 * exactly to the rounded offset.
 */
export function splitIntoDrags(offset: PixelPoint, maxPerAxis: number): PixelPoint[] {
    if (!(maxPerAxis > 0)) {
        throw new Error('maxPerAxis must be positive');
    }
    const totalX = Math.round(offset.x);
    const totalY = Math.round(offset.y);
    const count = Math.max(1, Math.ceil(Math.max(Math.abs(totalX), Math.abs(totalY)) / maxPerAxis));

    const drags: PixelPoint[] = [];
    let doneX = 0;
    let doneY = 0;
    for (let i = 1; i <= count; i++) {
        const targetX = Math.round(totalX * i / count);
        const targetY = Math.round(totalY * i / count);
        drags.push({ x: targetX - doneX, y: targetY - doneY });
        doneX = targetX;
        doneY = targetY;
    }
    return drags;
}

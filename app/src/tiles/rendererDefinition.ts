import { parseBooleanExact } from '../helpers';
import { getAllLayerNames, getBuildingLayerNames, getVectorLayerQuery } from "./dataDefinition";
import { TileCache } from "./tileCache";
import { TileParams } from "./types";
import { renderVectorTile } from './renderers/renderVectorTile';

/**
 * A list of all tilesets handled by the tile server
 */
const allTilesets = getAllLayerNames();

const allLayersCacheSwitch = parseBooleanExact(process.env.CACHE_TILES) ?? true;
const dataLayersCacheSwitch = parseBooleanExact(process.env.CACHE_DATA_TILES) ?? true;
let shouldCacheFn: (t: TileParams) => boolean;

if(!allLayersCacheSwitch) {
    shouldCacheFn = t => false;
} else if(dataLayersCacheSwitch) {
    shouldCacheFn = ({ tileset, z }: TileParams) => z <= 18;
} else {
    shouldCacheFn = ({ tileset, z }: TileParams) =>
        ['base_light', 'base_night', 'base_night_outlines'].includes(tileset) && z <= 18;
}

const tileCache = new TileCache(
    process.env.TILECACHE_PATH,
    {
        tilesets: getBuildingLayerNames(),
        minZoom: 9,
        maxZoom: 19,
        scales: [1, 2]
    },
    shouldCacheFn,
    
    // don't clear on bounding box cache clear tilesets not affected by user-editable data
    (tileset: string) => tileset !== 'base_light' && tileset !== 'base_night' && tileset !== 'base_night_outlines' && tileset !== "planning_applications_status_recent" && tileset !== "planning_applications_status_very_recent" && tileset !== "planning_applications_status_all"
);

const renderBuildingVectorTile = (t: TileParams) => renderVectorTile(t, getVectorLayerQuery(t.tileset));

export {
    allTilesets,
    renderBuildingVectorTile,
    tileCache
};

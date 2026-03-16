/**
 * Vector Tile Styles
 *
 * This file is the client-side equivalent of app/map_styles/polygon.xml.
 * It translates every Mapnik colour rule into TypeScript style functions
 * consumed by leaflet.vectorgrid when rendering .pbf vector tiles.
 *
 * Structure:
 *  - STROKE_COLOUR      — the grey outline colour used at higher zoom levels
 *  - getStrokeStyle()   — translates MaxScaleDenominator/MinScaleDenominator
 *                         XML rules into zoom-based stroke width/colour
 *  - One style function per tileset, named identically to the XML <Style name>
 *  - VECTOR_TILE_STYLES — the master export, mapping tileset name → style function
 *
 * Zoom thresholds (derived from Mapnik scale denominators):
 *  ScaleDenominator 17061 ≈ zoom 15
 *  ScaleDenominator  8530 ≈ zoom 16
 *  ScaleDenominator  4264 ≈ zoom 17
 *  ScaleDenominator  2132 ≈ zoom 18
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Style object returned to leaflet.vectorgrid for each feature.
 * All properties correspond to Leaflet Path options.
 */
export interface VectorTileFeatureStyle {
    fill:        boolean;
    fillColor:   string;
    fillOpacity: number;
    color:       string;   // outline / stroke colour
    weight:      number;   // outline / stroke width in pixels
    opacity:     number;
}

/**
 * A style function receives the feature's data properties and the current
 * map zoom level and returns a VectorTileFeatureStyle.
 */
export type StyleFunction = (
    properties: Record<string, any>,
    zoom: number
) => VectorTileFeatureStyle | null;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Grey outline used at zoom 15+ to delineate individual building footprints. */
const STROKE_COLOUR = '#888888';

/** Transparent — used when no fill matches (feature is not rendered). */
const TRANSPARENT = 'rgba(0,0,0,0)';

// ─── Stroke helpers ───────────────────────────────────────────────────────────

/**
 * Standard stroke rule (used by most tilesets):
 *   zoom < 15  → outline matches fill colour, weight 2
 *   zoom 15–16 → grey outline, weight 1   (MaxScaleDenominator 17061)
 *   zoom ≥ 17  → grey outline, weight 3   (MaxScaleDenominator  4264)
 */
function standardStroke(zoom: number, fillColour: string): Pick<VectorTileFeatureStyle, 'color' | 'weight'> {
    if (zoom >= 21) return { color: STROKE_COLOUR, weight: 0.3 };
    if (zoom >= 20) return { color: STROKE_COLOUR, weight: 0.5 };
    if (zoom >= 19) return { color: STROKE_COLOUR, weight: 0.75 };
    if (zoom >= 18) return { color: STROKE_COLOUR, weight: 1 };
    if (zoom >= 17) return { color: STROKE_COLOUR, weight: 1.5 };
    if (zoom >= 15) return { color: STROKE_COLOUR, weight: 1 };
    return { color: fillColour, weight: 2 };
}

function tightStroke(zoom: number, fillColour: string): Pick<VectorTileFeatureStyle, 'color' | 'weight'> {
    if (zoom >= 21) return { color: STROKE_COLOUR, weight: 0.3 };
    if (zoom >= 20) return { color: STROKE_COLOUR, weight: 0.5 };
    if (zoom >= 19) return { color: STROKE_COLOUR, weight: 0.75 };
    if (zoom >= 18) return { color: STROKE_COLOUR, weight: 1 };
    if (zoom >= 17) return { color: STROKE_COLOUR, weight: 1.5 };
    if (zoom >= 16) return { color: STROKE_COLOUR, weight: 1 };
    return { color: fillColour, weight: 2 };
}

function narrowStroke(zoom: number, fillColour: string): Pick<VectorTileFeatureStyle, 'color' | 'weight'> {
    if (zoom >= 21) return { color: STROKE_COLOUR, weight: 0.3 };
    if (zoom >= 20) return { color: STROKE_COLOUR, weight: 0.4 };
    if (zoom >= 19) return { color: STROKE_COLOUR, weight: 0.6 };
    if (zoom >= 18) return { color: STROKE_COLOUR, weight: 0.8 };
    if (zoom >= 17) return { color: STROKE_COLOUR, weight: 1 };
    if (zoom >= 16) return { color: STROKE_COLOUR, weight: 0.8 };
    return { color: fillColour, weight: 2 };
}

function typologyStroke(zoom: number, fillColour: string): Pick<VectorTileFeatureStyle, 'color' | 'weight'> {
    if (zoom >= 21) return { color: STROKE_COLOUR, weight: 0.3 };
    if (zoom >= 20) return { color: STROKE_COLOUR, weight: 0.5 };
    if (zoom >= 19) return { color: STROKE_COLOUR, weight: 0.6 };
    if (zoom >= 18) return { color: STROKE_COLOUR, weight: 0.8 };
    if (zoom >= 17) return { color: STROKE_COLOUR, weight: 1 };
    if (zoom >= 15) return { color: STROKE_COLOUR, weight: 0.8 };
    return { color: fillColour, weight: 2 };
}

// ─── Shared feature builder ───────────────────────────────────────────────────

/** Build a complete VectorTileFeatureStyle from a fill colour and stroke rule. */
function makeStyle(
    fillColour: string,
    strokeRule: Pick<VectorTileFeatureStyle, 'color' | 'weight'>
): VectorTileFeatureStyle {
    return {
        fill:        true,
        fillColor:   fillColour,
        fillOpacity: 1,
        opacity:     1,
        ...strokeRule,
    };
}

/** Return null to suppress rendering of a feature with no matching rule. */
function noStyle(): null {
    return null;
}

// ─── Year helper (shared by date_year, cladding_year, extension_year, retrofit_year) ──

function yearColour(year: number): string | null {
    if (year >= 2020) return '#fff9b8';
    if (year >= 2000) return '#fae269';
    if (year >= 1980) return '#fbaf27';
    if (year >= 1960) return '#e6711d';
    if (year >= 1940) return '#cc1212';
    if (year >= 1920) return '#8f0303';
    if (year >= 1900) return '#8f5385';
    if (year >= 1880) return '#c3e1eb';
    if (year >= 1860) return '#6a9dba';
    if (year >= 1840) return '#3b74a3';
    if (year >= 1820) return '#95ded8';
    if (year >= 1800) return '#68aba5';
    if (year >= 1750) return '#acc98f';
    if (year >= 1700) return '#6d8a51';
    return '#d0c291';
}

// ─── Per-tileset style functions ──────────────────────────────────────────────

function styleBaseLight(props: Record<string, any>, zoom: number): VectorTileFeatureStyle {
    return makeStyle('#cccccc', standardStroke(zoom, '#cccccc'));
}

function styleBaseNight(props: Record<string, any>, zoom: number): VectorTileFeatureStyle {
    return makeStyle('#303044', standardStroke(zoom, '#303044'));
}

function styleBaseNightOutlines(props: Record<string, any>, zoom: number): VectorTileFeatureStyle {
    // Scale rules from XML:
    //   zoom 14–18 (Max 20000, Min 1200): weight 0.5
    //   zoom 15–16 (Max 12000, Min 8000): weight 1.8
    //   zoom 16+   (Max  8000, Min 0   ): weight 4.0
    let weight: number;
    if (zoom >= 16)      weight = 4.0;
    else if (zoom >= 15) weight = 1.8;
    else                 weight = 0.5;

    return { fill: false, fillColor: TRANSPARENT, fillOpacity: 0, color: '#0081AF', weight, opacity: 1 };
}

function styleDateYear(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colour = yearColour(props.date_year);
    if (!colour) return noStyle();
    return makeStyle(colour, tightStroke(zoom, colour));
}

function styleCladdingYear(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colour = yearColour(props.date_year);
    if (!colour) return noStyle();
    return makeStyle(colour, tightStroke(zoom, colour));
}

function styleExtensionYear(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colour = yearColour(props.date_year);
    if (!colour) return noStyle();
    return makeStyle(colour, tightStroke(zoom, colour));
}

function styleRetrofitYear(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colour = yearColour(props.date_year);
    if (!colour) return noStyle();
    // retrofit_year uses red stroke (#ff0000) at higher zoom in the XML
    if (zoom >= 17) return makeStyle(colour, { color: '#ff0000', weight: 3 });
    if (zoom >= 16) return makeStyle(colour, { color: '#ff0000', weight: 1 });
    return makeStyle(colour, { color: colour, weight: 2 });
}

function styleSizeHeight(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const h = props.size_height;
    let colour: string;
    if      (h >= 152)            colour = '#980043';
    else if (h >= 89.30)          colour = '#ce1256';
    else if (h >= 35.05)          colour = '#e7298a';
    else if (h >= 18.45)          colour = '#df65b0';
    else if (h >= 11.38)          colour = '#c994c7';
    else if (h >= 7.73)           colour = '#d4b9da';
    else if (h >= 5.55)           colour = '#e7e1ef';
    else if (h !== null && h >= 0) colour = '#f7f4f9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleSizeTotalFloors(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const f = props.size_total_floors;
    let colour: string;
    if      (f >= 35) colour = '#980043';
    else if (f >= 21) colour = '#ce1256';
    else if (f >= 11) colour = '#e7298a';
    else if (f >= 6)  colour = '#df65b0';
    else if (f >= 5)  colour = '#c994c7';
    else if (f >= 3)  colour = '#d4b9da';
    else if (f >= 2)  colour = '#e7e1ef';
    else if (f >= 1)  colour = '#f7f4f9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleSizeStoreysBasement(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const b = props.size_storeys_basement;
    let colour: string;
    if      (b >= 4) colour = '#ce1256';
    else if (b >= 3) colour = '#df65b0';
    else if (b >= 2) colour = '#d4b9da';
    else if (b >= 1) colour = '#f7f4f9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleSizeFloorAreaGround(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const a = props.size_floor_area_ground;
    let colour: string;
    if      (a >= 2000) colour = '#980043';
    else if (a >= 1000) colour = '#ce1256';
    else if (a >= 500)  colour = '#e7298a';
    else if (a >= 250)  colour = '#df65b0';
    else if (a >= 100)  colour = '#c994c7';
    else if (a >= 50)   colour = '#d4b9da';
    else if (a >= 25)   colour = '#e7e1ef';
    else if (a >= 0.1)  colour = '#f7f4f9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleConstructionCoreMaterial(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Wood':                    '#b5a859',
        'Stone':                   '#ffffe3',
        'Brick':                   '#f5d96b',
        'Steel':                   '#beffe8',
        'Reinforced Concrete':     '#fca89d',
        'Other Metal':             '#5c8970',
        'Other Natural Material':  '#96613b',
        'Other Man-Made Material': '#c48a85',
    };
    const colour = colourMap[props.construction_core_material];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleConstructionStructuralSystem(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Solid masonry walls supporting the roof':                                              '#b5a859',
        'A lateral load resisting structure (e.g. concrete, steel or wooden frame)':           '#ffffe3',
        'Other':                                                                                '#f5d96b',
    };
    const colour = colourMap[props.construction_structural_system];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleConstructionFoundation(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Shallow foundations with no lateral support':  '#b5a859',
        'Shallow foundations with lateral support':     '#ffffe3',
        'Deep foundations with no lateral support':     '#f5d96b',
        'Deep Foundations with lateral support':        '#beffe8',
        'Other':                                        '#fca89d',
    };
    const colour = colourMap[props.construction_foundation];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleConstructionRoofShape(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Flat':                 '#b5a859',
        'Pitched with gable ends': '#ffffe3',
        'Pitched and hipped':   '#f5d96b',
        'Pitched with dormers': '#beffe8',
        'Monopitch':            '#fca89d',
        'Sawtooth':             '#5c8970',
        'Curved':               '#96613b',
        'Complex regular':      '#c48a85',
        'Complex irregular':    '#7bccc4',
        'Other':                '#bae4bc',
    };
    const colour = colourMap[props.construction_roof_shape];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleConstructionRoofCovering(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Corrugated Metal Sheet':   '#b5a859',
        'Concrete (Flat Roof)':     '#ffffe3',
        'Asbestos Sheet':           '#f5d96b',
        'Thatch':                   '#beffe8',
        'Roofing Tiles':            '#5c8970',
        'Other Natural Material':   '#96613b',
        'Other Man-Made Material':  '#c48a85',
    };
    const colour = colourMap[props.construction_roof_covering];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleConstructionMaterialWindowFrame(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Wood':          '#b5a859',
        'Metal':         '#beffe8',
        'uPVC/Plastic':  '#fca89d',
        'Other':         '#c48a85',
    };
    const colour = colourMap[props.construction_material_window_frame];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleLocation(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const count = props.location_info_count;
    let colour: string;
    if      (count >= 8) colour = '#084081';
    else if (count >= 6) colour = '#0868ac';
    else if (count >= 4) colour = '#43a2ca';
    else if (count >= 2) colour = '#7bccc4';
    else if (count > 0)  colour = '#bae4bc';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleTeam(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const count = props.team_info_count;
    let colour: string;
    if      (count >= 8) colour = '#994d00';
    else if (count >= 6) colour = '#e67300';
    else if (count >= 4) colour = '#ff9933';
    else if (count >= 2) colour = '#ffbf80';
    else if (count > 0)  colour = '#ffe6cc';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleTeamKnownDesigner(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (props.team_known_designer !== true) return noStyle();
    const colour = '#6bb1e3';
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleIsDomestic(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'yes':                        '#f7ec25',
        'mixed domestic/non-domestic':'#fc9b2a',
        'no':                         '#ff2121',
    };
    const colour = colourMap[props.is_domestic];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleSurvivalStatus(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Same as Historical Map (Unchanged)':          '#6ded45',
        'Similar to Historical Map (Some Changes)':    '#f7c725',
        'Historical Building(s) Demolished':           '#ff2121',
        'Current Building on Previous Green Space':    '#CF26DF',
    };
    const colour = colourMap[props.survival_status];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleLikes(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const likes = props.likes;
    let colour: string;
    if      (likes >= 100) colour = '#bd0026';
    else if (likes >= 50)  colour = '#e31a1c';
    else if (likes >= 20)  colour = '#fc4e2a';
    else if (likes >= 10)  colour = '#fd8d3c';
    else if (likes >= 3)   colour = '#feb24c';
    else if (likes === 2)  colour = '#fed976';
    else if (likes === 1)  colour = '#ffe8a9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleTypologyLikes(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleLikes(props, zoom); // identical colour rules
}

function styleCommunityLocalSignificanceTotal(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const val = props.community_local_significance_total;
    let colour: string;
    if      (val >= 100) colour = '#bd0026';
    else if (val >= 50)  colour = '#e31a1c';
    else if (val >= 20)  colour = '#fc4e2a';
    else if (val >= 10)  colour = '#fd8d3c';
    else if (val >= 3)   colour = '#feb24c';
    else if (val === 2)  colour = '#fed976';
    else if (val === 1)  colour = '#ffe8a9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleCommunityExpectedPlanningApplicationTotal(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const val = props.community_expected_planning_application_total;
    let colour: string;
    if      (val >= 100) colour = '#bd0026';
    else if (val >= 50)  colour = '#e31a1c';
    else if (val >= 20)  colour = '#fc4e2a';
    else if (val >= 10)  colour = '#fd8d3c';
    else if (val >= 3)   colour = '#feb24c';
    else if (val === 2)  colour = '#fed976';
    else if (val === 1)  colour = '#ffe8a9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleCommunityInPublicOwnership(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (props.in_public_ownership === true)  return makeStyle('#1166ff', standardStroke(zoom, '#1166ff'));
    if (props.in_public_ownership === false) return makeStyle('#ffaaa0', standardStroke(zoom, '#ffaaa0'));
    return noStyle();
}

function styleNeuroaestheticAvg(
    value: number | null,
    colours: [string, string, string, string, string],
    zoom: number
): VectorTileFeatureStyle | null {
    if (value === null) return noStyle();
    let colour: string;
    if      (value > 4) colour = colours[0];
    else if (value > 3) colour = colours[1];
    else if (value > 2) colour = colours[2];
    else if (value > 1) colour = colours[3];
    else                colour = colours[4];
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleCommunityBuildingHominessAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_building_hominess_avg, ['#00d924','#3efa5e','#7dfa92','#a8fab5','#e1fce5'], zoom);
}
function styleCommunityBuildingCoherenceAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_building_coherence_avg, ['#005efa','#3e86fa','#7dabfa','#bbd3fa','#e1ebfc'], zoom);
}
function styleCommunityBuildingFascinationAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_building_fascination_avg, ['#b300fa','#c33efa','#d97dfa','#e8bbfa','#f1e1f7'], zoom);
}
function styleCommunityBuildingNeuroaestheticAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_building_neuroaesthetic_avg, ['#00ced9','#3cf0fa','#7df4fa','#bbf7fa','#fafafa'], zoom);
}
function styleCommunityStreetscapeHominessAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_streetscape_hominess_avg, ['#7fd900','#acfa3e','#c6fa7d','#d8faa8','#f0fcde'], zoom);
}
function styleCommunityStreetscapeCoherenceAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_streetscape_coherence_avg, ['#00e5fa','#3eeafa','#7df0fa','#bbf5fa','#e3fafc'], zoom);
}
function styleCommunityStreetscapeFascinationAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_streetscape_fascination_avg, ['#fa0060','#fa3e86','#fa7dad','#fabbd3','#fce8f0'], zoom);
}
function styleCommunityStreetscapeNeuroaestheticAvg(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleNeuroaestheticAvg(props.community_streetscape_neuroaesthetic_avg, ['#00ced9','#3cf0fa','#7df4fa','#bbf7fa','#fafafa'], zoom);
}

function stylePlanningApplicationsStatusAll(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Submitted':          '#a040a0',
        'Approved':           '#16cf15',
        'Appeal In Progress': '#fff200',
        'Rejected':           '#e31d23',
        'Withdrawn':          '#7a84a0',
    };
    const colour = colourMap[props.status] ?? '#eacad0';
    return makeStyle(colour, { color: colour, weight: 1.75 });
}

function stylePlanningApplicationsStatusRecent(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const { status, days_since_decision_date, days_since_registered_with_local_authority_date } = props;
    const days = days_since_decision_date ?? days_since_registered_with_local_authority_date;
    if (days >= 366) return noStyle();

    const colourMap: Record<string, string> = {
        'Submitted':          '#a040a0',
        'Approved':           '#16cf15',
        'Appeal In Progress': '#fff200',
        'Rejected':           '#e31d23',
        'Withdrawn':          '#7a84a0',
    };
    const colour = colourMap[status] ?? '#eacad0';
    return makeStyle(colour, { color: colour, weight: 1.75 });
}

function stylePlanningApplicationsStatusVeryRecent(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const { status, days_since_decision_date, days_since_registered_with_local_authority_date } = props;
    const days = days_since_decision_date ?? days_since_registered_with_local_authority_date;
    if (days > 30) return noStyle();

    const colourMap: Record<string, string> = {
        'Submitted':          '#a040a0',
        'Approved':           '#16cf15',
        'Appeal In Progress': '#fff200',
        'Rejected':           '#e31d23',
        'Withdrawn':          '#7a84a0',
    };
    const colour = colourMap[status] ?? '#eacad0';
    return makeStyle(colour, { color: colour, weight: 1.75 });
}

function stylePlanningCombined(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const { listing_type, planning_in_conservation_area } = props;

    // Determine fill colour — listing type takes priority over conservation area
    const listingColours: Record<string, string> = {
        'Grade I Listed':                    '#c72e08',
        'Grade II* Listed':                  '#e75b42',
        'Grade II Listed':                   '#ffbea1',
        'Locally Listed':                    '#858ed4',
        'Heritage at Risk':                  '#85ffd4',
        'In World Heritage Site':            '#858eff',
        'In Archaeological Priority Area':   '#8500d4',
    };

    const fillColour = listing_type !== 'None'
        ? (listingColours[listing_type] ?? null)
        : (planning_in_conservation_area ? '#95beba' : null);

    if (!fillColour) return noStyle();

    // Conservation area outline overlay
    const hasListing = listing_type !== 'None';
    const inConservation = planning_in_conservation_area === true;

    let strokeColour = fillColour;
    let strokeWeight = 2;

    if (hasListing && inConservation) {
        // Conservation area outline on top of listing colour
        if (zoom >= 17)      { strokeColour = '#95beba'; strokeWeight = 2.5; }
        else if (zoom >= 16) { strokeColour = '#95beba'; strokeWeight = 1.0; }
        else if (zoom >= 14) { strokeColour = '#95beba'; strokeWeight = 0.5; }
    } else if (listing_type !== 'None' || inConservation) {
        if (zoom >= 17)      { strokeColour = STROKE_COLOUR; strokeWeight = 3; }
        else if (zoom >= 15) { strokeColour = STROKE_COLOUR; strokeWeight = 1; }
    }

    return makeStyle(fillColour, { color: strokeColour, weight: strokeWeight });
}

function styleSustDec(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'A': '#007f3d', 'B': '#2c9f29', 'C': '#9dcb3c',
        'D': '#fff200', 'E': '#f7af1d', 'F': '#ed6823', 'G': '#e31d23',
    };
    const colour = colourMap[props.sust_dec];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleSustAggregateEstimateEpc(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'A': '#007f3d', 'B': '#2c9f29', 'C': '#9dcb3c',
        'D': '#fff200', 'E': '#f7af1d', 'F': '#ed6823', 'G': '#e31d23',
    };
    const colour = colourMap[props.sust_aggregate_estimate_epc] ?? '#c0c0c0';
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleBuildingAttachmentForm(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Detached':      '#f2a2b9',
        'Semi-Detached': '#ab8fb0',
        'End-Terrace':   '#3891d1',
        'Mid-Terrace':   '#226291',
    };
    const colour = colourMap[props.building_attachment_form];
    if (!colour) return noStyle();
    const stroke = zoom >= 17 ? { color: STROKE_COLOUR, weight: 2 }
                 : zoom >= 15 ? { color: STROKE_COLOUR, weight: 0.8 }
                 : { color: colour, weight: 2 };
    return makeStyle(colour, stroke);
}

function styleLanduse(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Residential':                      '#7025a6',
        'Commercial':                       '#ff8c00',
        'Industrial':                       '#f5f58f',
        'Agricultural':                     '#73ccd1',
        'Mining and Extractive':            '#45cce3',
        'Transportation and Infrastructure':'#b3de69',
        'Public & Institutional':           '#fa667d',
        'Recreational & Open Space':        '#ffbfbf',
        'Conservation':                     '#cccccc',
        'Unclassified':                     '#6c6f8e',
        'Mixed Use':                        '#e5050d',
    };
    const colour = colourMap[props.current_landuse_order];
    if (!colour) return noStyle();
    return makeStyle(colour, narrowStroke(zoom, colour));
}

function styleOriginalLanduse(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Residential':                      '#7025a6',
        'Commercial':                       '#ff8c00',
        'Industrial':                       '#f5f58f',
        'Agricultural':                     '#73ccd1',
        'Mining and Extractive':            '#45cce3',
        'Transportation and Infrastructure':'#b3de69',
        'Public & Institutional':           '#fa667d',
        'Recreational & Open Space':        '#ffbfbf',
        'Conservation':                     '#cccccc',
        'Unclassified':                     '#6c6f8e',
        'Mixed Use':                        '#e5050d',
    };
    const colour = colourMap[props.typology_original_use_order];
    if (!colour) return noStyle();
    return makeStyle(colour, narrowStroke(zoom, colour));
}

function styleDisasterSeverity(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Building destroyed': '#bd0026',
        'Very severe':        '#e31a1c',
        'Severe':             '#fc4e2a',
        'Moderate':           '#fd8d3c',
        'Minimal':            '#feb24c',
        'No damage visible':  '#fed976',
    };
    const colour = colourMap[props.disaster_severity];
    if (!colour) return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleDynamicsDemolishedCount(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (props.dynamics_has_demolished_buildings === false) {
        return makeStyle('#0C7BDC', standardStroke(zoom, '#0C7BDC'));
    }
    const count = props.demolished_buildings_count;
    let colour: string;
    if      (count >= 7) colour = '#bd0026';
    else if (count === 6) colour = '#e31a1c';
    else if (count === 5) colour = '#fc4e2a';
    else if (count === 4) colour = '#fd8d3c';
    else if (count === 3) colour = '#feb24c';
    else if (count === 2) colour = '#fed976';
    else if (count === 1) colour = '#ffe8a9';
    else return noStyle();
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleTypologyClassification(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Low-rise: Not part of a group/cluster (1-3 core floors- excluding extensions)': '#0311AB',
        'Low-rise: Part of dense block/row/terrace':                                     '#3845D4',
        'Low-rise: Part of group of widely spaced blocks (includes semi-detached houses)': '#6D79FD',
        'Mid-rise: Not part of a group/cluster (4-7 core floors)':                       '#FF5D00',
        'Mid-rise: Part of group of densely spaced blocks':                               '#FF8000',
        'Mid-rise: Part of group of widely spaced blocks':                                '#FFA200',
        'High rise: Not part of a group/cluster':                                         '#AB1303',
        'High-rise: Part of group of densely spaced blocks (8 + core floors)':           '#D43A29',
        'High-rise: Part of group of widely spaced blocks':                               '#FC604F',
    };
    const colour = colourMap[props.typology_classification];
    if (!colour) return noStyle();
    return makeStyle(colour, typologyStroke(zoom, colour));
}

function styleTypologyStylePeriod(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        '43AD-410 (Roman)':            '#dadada',
        '410-1485 (Medieval)':         '#a9a695',
        '1485-1603 (Tudor)':           '#d0c291',
        '1603-1714 (Stuart)':          '#6d8a51',
        '1714-1837 (Georgian)':        '#acc98f',
        '1837-1901 (Victorian)':       '#6a9dba',
        '1901-1914 (Edwardian)':       '#c3e1eb',
        '1914-1945 (WWI-WWII)':        '#8f5385',
        '1946-1979 (Post war)':        '#cc1212',
        '1980-1999 (Late 20th Century)': '#fbaf27',
        '2000-2025 (Early 21st Century)': '#fae269',
    };
    const colour = colourMap[props.typology_style_period];
    if (!colour) return noStyle();
    return makeStyle(colour, typologyStroke(zoom, colour));
}

function styleTypologyDynamicClassification(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colourMap: Record<string, string> = {
        'Small, often repetitive plots, mainly residential': '#FF7F11',
        'Linear non-domestic, i.e. high streets':            '#FF1B1C',
        'Large plots with internal roads':                   '#40E0D0',
    };
    const colour = colourMap[props.typology_dynamic_classification];
    if (!colour) return noStyle();
    return makeStyle(colour, typologyStroke(zoom, colour));
}

function styleContextBackGarden(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (props.context_back_garden !== true) return noStyle();
    const colour = '#7cbf39';
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleContextStreetWidth(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const w = props.context_street_width;
    if (w === null || w === undefined) return noStyle();
    // No explicit colour scale in XML — use a blue gradient as a reasonable default
    let colour: string;
    if      (w >= 30) colour = '#084081';
    else if (w >= 20) colour = '#0868ac';
    else if (w >= 15) colour = '#43a2ca';
    else if (w >= 10) colour = '#7bccc4';
    else              colour = '#bae4bc';
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleContextWalkabilityIndex(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const w = props.context_walkability_index;
    if (w === null || w === undefined) return noStyle();
    let colour: string;
    if      (w >= 8) colour = '#084081';
    else if (w >= 6) colour = '#0868ac';
    else if (w >= 4) colour = '#43a2ca';
    else if (w >= 2) colour = '#7bccc4';
    else             colour = '#bae4bc';
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleDesignerAwards(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (props.designer_awards !== true) return noStyle();
    const colour = '#f7ec25';
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleEnergySolar(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (props.energy_solar !== true) return noStyle();
    const colour = '#6bb1e3';
    return makeStyle(colour, standardStroke(zoom, colour));
}

function styleEnergyGreenRoof(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (props.energy_green_roof !== true) return noStyle();
    const colour = '#7cbf39';
    return makeStyle(colour, standardStroke(zoom, colour));
}

/**
 * Factory that returns a StyleFunction for the highlight tileset.
 * Filters client-side: only the selected building gets a coloured outline;
 * every other feature is suppressed (returns null).
 */
export function makeHighlightStyle(
    selectedBuildingId: number,
    baseTileset: string,
): StyleFunction {
    if (!selectedBuildingId) return () => null;

    const isRedHighlight = baseTileset === 'location' || baseTileset === 'conservation_area';
    const colour = isRedHighlight ? '#ff0000' : '#00ffff';

    return (properties: Record<string, any>, _zoom: number): VectorTileFeatureStyle | null => {
        if (Number(properties.building_id) !== Number(selectedBuildingId)) return null;
        return {
            fill:        false,
            fillColor:   TRANSPARENT,
            fillOpacity: 0,
            color:       colour,
            weight:      4.5,
            opacity:     0.67,
        };
    };
}

function styleAgeAmalgamated(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    // age_amalgamated uses the same year colour scale as date_year
    return styleDateYear(props, zoom);
}

function styleAgeInferred(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    return styleDateYear(props, zoom);
}

function styleNumberLabels(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    if (zoom < 18 || !props.location_number) return null;
    return {
        fill:        false,
        fillColor:   TRANSPARENT,
        fillOpacity: 0,
        color:       '#333333',
        weight:      2,
        opacity:     0.8,
    };
}

function stylePlanningWorldHeritageSites(props: Record<string, any>, zoom: number): VectorTileFeatureStyle | null {
    const colour = '#858eff';
    return makeStyle(colour, standardStroke(zoom, colour));
}

// ─── Master style map ─────────────────────────────────────────────────────────

/**
 * Maps every tileset name to its style function.
 * This is the single export consumed by BuildingVectorDataLayer.
 */
export const VECTOR_TILE_STYLES: Record<string, StyleFunction> = {
    base_light:                                 styleBaseLight,
    base_night:                                 styleBaseNight,
    base_night_outlines:                        styleBaseNightOutlines,
    number_labels:                              styleNumberLabels,
    age_amalgamated:                            styleAgeAmalgamated,
    age_inferred:                               styleAgeInferred,
    date_year:                                  styleDateYear,
    cladding_year:                              styleCladdingYear,
    extension_year:                             styleExtensionYear,
    retrofit_year:                              styleRetrofitYear,
    size_height:                                styleSizeHeight,
    size_total_floors:                          styleSizeTotalFloors,
    size_storeys_basement:                      styleSizeStoreysBasement,
    size_floor_area_ground:                     styleSizeFloorAreaGround,
    construction_core_material:                 styleConstructionCoreMaterial,
    construction_structural_system:             styleConstructionStructuralSystem,
    construction_foundation:                    styleConstructionFoundation,
    construction_roof_shape:                    styleConstructionRoofShape,
    construction_roof_covering:                 styleConstructionRoofCovering,
    construction_material_window_frame:         styleConstructionMaterialWindowFrame,
    location:                                   styleLocation,
    team:                                       styleTeam,
    team_known_designer:                        styleTeamKnownDesigner,
    is_domestic:                                styleIsDomestic,
    survival_status:                            styleSurvivalStatus,
    likes:                                      styleLikes,
    typology_likes:                             styleTypologyLikes,
    community_local_significance_total:         styleCommunityLocalSignificanceTotal,
    community_expected_planning_application_total: styleCommunityExpectedPlanningApplicationTotal,
    community_in_public_ownership:              styleCommunityInPublicOwnership,
    community_building_hominess_avg:            styleCommunityBuildingHominessAvg,
    community_building_coherence_avg:           styleCommunityBuildingCoherenceAvg,
    community_building_fascination_avg:         styleCommunityBuildingFascinationAvg,
    community_building_neuroaesthetic_avg:      styleCommunityBuildingNeuroaestheticAvg,
    community_streetscape_hominess_avg:         styleCommunityStreetscapeHominessAvg,
    community_streetscape_coherence_avg:        styleCommunityStreetscapeCoherenceAvg,
    community_streetscape_fascination_avg:      styleCommunityStreetscapeFascinationAvg,
    community_streetscape_neuroaesthetic_avg:   styleCommunityStreetscapeNeuroaestheticAvg,
    planning_applications_status_all:           stylePlanningApplicationsStatusAll,
    planning_applications_status_recent:        stylePlanningApplicationsStatusRecent,
    planning_applications_status_very_recent:   stylePlanningApplicationsStatusVeryRecent,
    planning_combined:                          stylePlanningCombined,
    planning_world_heritage_buildings:          stylePlanningWorldHeritageSites,
    sust_dec:                                   styleSustDec,
    sust_aggregate_estimate_epc:                styleSustAggregateEstimateEpc,
    building_attachment_form:                   styleBuildingAttachmentForm,
    landuse:                                    styleLanduse,
    original_landuse:                           styleOriginalLanduse,
    disaster_severity:                          styleDisasterSeverity,
    dynamics_demolished_count:                  styleDynamicsDemolishedCount,
    typology_classification:                    styleTypologyClassification,
    typology_style_period:                      styleTypologyStylePeriod,
    typology_dynamic_classification:            styleTypologyDynamicClassification,
    context_back_garden:                        styleContextBackGarden,
    context_street_width:                       styleContextStreetWidth,
    context_walkability_index:                  styleContextWalkabilityIndex,
    designer_awards:                            styleDesignerAwards,
    energy_solar:                               styleEnergySolar,
    energy_green_roof:                          styleEnergyGreenRoof,
};
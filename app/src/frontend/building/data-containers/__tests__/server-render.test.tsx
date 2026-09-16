/**
 * @jest-environment node
 *
 * Regression test for docs/tickets/building-view/issues/01-server-render-building-route-window.md:
 * every data container must render on the server (no `window`), and the `sc` query parameter must
 * still pick the sub-category group that starts expanded.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { Building } from '../../../models/building';
import { DataContainerType } from '../../data-container';

import AgeHistoryContainer from '../age-history';
import CommunityContainer from '../community';
import ConstructionDesignContainer from '../construction-design';
import DisasterManagementContainer from '../disaster-management';
import EnergyPerformanceContainer from '../energy-performance';
import LandUseContainer from '../land-use';
import LocationContainer from '../location';
import PlanningConservationContainer from '../planning-conservation';
import RetrofitConditionContainer from '../retrofit-condition';
import TypologySizeContainer from '../typology-size';
import UrbanInfrastructureContainer from '../urban-infrastructure';
import WaterGreenInfrastructureContainer from '../water-green-infrastructure';

const containers: [string, DataContainerType][] = [
    ['age-history', AgeHistoryContainer],
    ['community', CommunityContainer],
    ['construction-design', ConstructionDesignContainer],
    ['disaster-management', DisasterManagementContainer],
    ['energy-performance', EnergyPerformanceContainer],
    ['land-use', LandUseContainer],
    ['location', LocationContainer],
    ['planning-conservation', PlanningConservationContainer],
    ['retrofit-condition', RetrofitConditionContainer],
    ['typology-size', TypologySizeContainer],
    ['urban-infrastructure', UrbanInfrastructureContainer],
    ['water-green-infrastructure', WaterGreenInfrastructureContainer],
];

// The containers only read attributes, so an otherwise empty building is enough for a render.
const building = {
    building_id: 1,
    geometry_id: 1,
    revision_id: '1',
    verified: {},
    planning_data: [],
} as unknown as Building;

function renderOnServer(Container: DataContainerType, cat: string, location: string): string {
    return renderToString(
        <StaticRouter location={location} context={{}}>
            <Container
                title={cat}
                cat={cat}
                intro=""
                help=""
                mode="view"
                building={building}
                user_verified={{}}
                onBuildingUpdate={() => undefined}
                onUserVerifiedUpdate={() => undefined}
                mapColourScale={undefined}
                onMapColourScale={() => undefined}
            />
        </StaticRouter>
    );
}

/** Whether the named group's body starts collapsed in the markup (the body div follows the header div). */
function isCollapsed(markup: string, groupName: string): boolean {
    const header = `<span class="data-entry-group-title">${groupName}</span></div>`;
    const start = markup.indexOf(header);
    expect(start).toBeGreaterThan(-1);
    const body = markup.slice(start + header.length).match(/^<div class="([^"]*)"/);
    expect(body).not.toBeNull();
    return body[1].split(' ').includes('collapse');
}

describe('data containers on the server', () => {
    test.each(containers)('%s renders to a string without a window', (cat, Container) => {
        const markup = renderOnServer(Container, cat, `/view/${cat}/1?sc=2`);
        expect(markup).toContain('data-entry-group-body');
    });

    test('?sc=2 expands the matching group and leaves the others collapsed', () => {
        const markup = renderOnServer(UrbanInfrastructureContainer, 'urban-infrastructure', '/view/urban-infrastructure/1?sc=2');

        expect(isCollapsed(markup, 'Street/Pavement')).toBe(false);
        expect(isCollapsed(markup, 'Number of Entrances Facing Street')).toBe(true);
    });

    test('?sc=<n> picks the group by number', () => {
        const markup = renderOnServer(RetrofitConditionContainer, 'retrofit-condition', '/view/retrofit-condition/1?sc=7');

        expect(isCollapsed(markup, 'Retrofit History')).toBe(true);
        expect(isCollapsed(markup, 'Condition')).toBe(false);
    });

    test('without sc every group starts collapsed', () => {
        const markup = renderOnServer(RetrofitConditionContainer, 'retrofit-condition', '/view/retrofit-condition/1');

        expect(isCollapsed(markup, 'Retrofit History')).toBe(true);
        expect(isCollapsed(markup, 'Condition')).toBe(true);
    });
});

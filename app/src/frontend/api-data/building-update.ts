import { BuildingAttributes, BuildingEdits, BuildingUserAttributes } from '../models/building';
import { apiPost } from '../apiHelpers';
import { allFieldsConfig, buildingUserFields, dataFields } from '../config/data-fields-config';

export type UpdatedBuilding = Partial<BuildingAttributes> & Partial<BuildingUserAttributes> & {
    revision_id: string;
};

function makeUpdateData(edits: BuildingEdits) {
    const data = {
        attributes: {},
        user_attributes: {}
    };

    for (let [field, value] of Object.entries(edits)) {
        if (dataFields[field]) {
            data.attributes[field] = value;
        } else if (buildingUserFields[field]) {
            data.user_attributes[field] = value;
        }
    }

    return data;
}

/**
 * The message for an update the API refused. When the refusal names a field the form has a title for,
 * the message says which field to check, by that title; the field's internal name is never shown.
 * Ticket: docs/tickets/location-search/issues/08-refused-edit-names-the-field.md
 */
function refusalMessage(error: string, field: unknown): string {
    const title = typeof field === 'string' ? allFieldsConfig[field]?.title : undefined;
    if (typeof title === 'string' && title !== '') {
        return `Nothing was saved. Check "${title}": ${error}`;
    }
    return error;
}

export async function sendBuildingUpdate(buildingId: number, edits: BuildingEdits): Promise<UpdatedBuilding> {
    const requestData = makeUpdateData(edits);
    const data = await apiPost(
        `/api/buildings/${buildingId}.json`,
        requestData
    );

    if (data.error) {
        throw refusalMessage(data.error, data.field);
    } else {
        const {
            revision_id,
            attributes,
            user_attributes
        } = data;

       return {
            revision_id,
            ...attributes,
            ...user_attributes
        };
    }
}
import { buildingAttributesConfig } from '../../config/dataFields';
import { BaseBuilding } from '../../models/building';
import * as buildingDataAccess from '../../dataAccess/building';
import * as verifyDataAccess from '../../dataAccess/verify';
import { DatabaseError, InvalidFieldError, InvalidOperationError, UserError } from '../../errors/general';

function canVerify(key: string) {
    // a key that is not a building attribute cannot be verified either
    return buildingAttributesConfig[key]?.verify === true;
}

export async function verifyBuildingAttributes(buildingId: number, userId: string, patch: object) {
    // get current building attribute values for comparison
    const building = await buildingDataAccess.getBuildingData(buildingId);
    // keep track of attributes and values verified
    const verified = {}

    // loop through attribute => value pairs to mark as verified
    for (let [key, value] of Object.entries(patch)) {
        // check key in whitelist
        if(canVerify(key)) {
            // check value against current from database - JSON.stringify as hack for "any" data type
            if (JSON.stringify(value) == JSON.stringify(building[key])) {
                try {
                    await verifyDataAccess.updateBuildingUserVerifiedAttribute(buildingId, userId, key, building[key]);
                    verified[key] = building[key];
                } catch (error) {
                    // user already verified this attribute for this building:
                    // a refusal to tell the person about, not a database failure
                    if(error instanceof UserError) {
                        throw error;
                    }
                    // possible reasons:
                    // - not a building
                    // - not a user
                    throw new DatabaseError(error);
                }
            } else {
                if (value === null) {
                    await verifyDataAccess.removeBuildingUserVerifiedAttribute(buildingId, userId, key);
                } else {
                    // not verifying current value
                    // the message holds neither value (they are what a person typed) nor the field's internal name
                    const msg = 'The value sent does not match the saved value, so it was not verified. Reload the building and try again.';
                    throw new InvalidOperationError(msg);
                }
            }
        } else {
            // not a valid attribute
            // the key is not put in the message: it is whatever the request sent
            throw new InvalidFieldError('Field cannot be verified', key);
        }
    }
    return verified;
}

export async function getUserVerifiedAttributes(buildingId: number, userId: string) {
    return await verifyDataAccess.getBuildingUserVerifiedAttributes(buildingId, userId);
}

export async function getBuildingVerifications(building: BaseBuilding) {
    const verifications = await verifyDataAccess.getBuildingVerifiedAttributes(building.building_id);

    const verified: Record<string, number> = {};

    for (const item of verifications) {
        if (JSON.stringify(building[item.attribute]) == JSON.stringify(item.verified_value)) {
            const count = verified[item.attribute] || 0;
            verified[item.attribute] = count + 1;
        }
    }
    return verified;
}

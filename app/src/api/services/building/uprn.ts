import db from '../../../db';
import { logErrorSafely } from '../../logError';

export async function getBuildingUPRNsById(id: number) {
    try {
        return await db.any(
            'SELECT uprn, parent_uprn FROM building_properties WHERE building_id = $1',
            [id]
        );
    } catch(error) {
        logErrorSafely('Failed to get building UPRNs:', error);
        return undefined;
    }
}
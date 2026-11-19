import db from '../../../db';
import { logErrorSafely } from '../../logError';

export async function getLatestRevisionId() {
    try {
        const data = await db.oneOrNone(
            `SELECT MAX(log_id) from logs`
        );
        return data == undefined ? undefined : data.max;
    } catch(err) {
        logErrorSafely('Failed to get latest revision id:', err);
        return undefined;
    }
}

export async function getBuildingEditHistory(id: number) {
    try {
        return await db.manyOrNone(
            `SELECT log_id as revision_id, forward_patch, reverse_patch, date_trunc('minute', log_timestamp) as revision_timestamp, username
            FROM logs, users
            WHERE building_id = $1 AND logs.user_id = users.user_id
            ORDER BY log_timestamp DESC`,
            [id]
        );
    } catch(error) {
        logErrorSafely('Failed to get building edit history:', error);
        return [];
    }
}

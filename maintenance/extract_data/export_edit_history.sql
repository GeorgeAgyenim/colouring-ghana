SELECT
    log_id as revision_id,
    date_trunc('second', log_timestamp) as revision_timestamp,
    building_id,
    forward_patch,
    reverse_patch,
    u.username as user
FROM logs l
-- LEFT JOIN: logs.user_id may be empty, and every change belongs in the history
LEFT JOIN users u
    ON l.user_id = u.user_id
ORDER BY log_id

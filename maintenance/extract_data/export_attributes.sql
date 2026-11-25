-- Every column of buildings: the same row the public building API already returns
-- (app/src/api/dataAccess/building.ts), so the extract never falls behind new migrations.
SELECT *
FROM buildings
ORDER BY building_id

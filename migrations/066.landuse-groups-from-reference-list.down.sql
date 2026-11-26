--
-- Removes the land-use group check added by 066.landuse-groups-from-reference-list.up.sql.
-- Ticket: docs/tickets/query-engine/issues/17-cut-off-land-use-values.md
-- Run before 065's down, as the owner of the buildings table, with psql -v ON_ERROR_STOP=1.
-- Dropping a trigger needs a lock that pauses reads of buildings too, so this waits at most 2 s
-- for it and otherwise stops and changes nothing; run it again when the database is quieter.
--
BEGIN;

SET LOCAL lock_timeout = '2s';

DROP TRIGGER IF EXISTS buildings_landuse_groups_listed ON public.buildings;
DROP FUNCTION IF EXISTS public.buildings_check_landuse_groups_listed();
DROP FUNCTION IF EXISTS public.buildings_assert_landuse_groups_listed(integer, text, text[]);

COMMIT;

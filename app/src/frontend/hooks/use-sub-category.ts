/*
 * Reads the `sc` (sub-category) part of the page's address through the router, so it works on the server as
 * well as in the browser. The building categories used to read it from `window.location`, which does not
 * exist on the server, so every building page failed there.
 * Ticket: docs/tickets/location-search/issues/14-building-pages-fail-on-the-server.md
 */
import { useQuery } from './use-query';

/**
 * The `sc` query parameter, or null when the address has none.
 *
 * Answers as `URLSearchParams.get('sc')` did before: when `sc` is given more than once, the first one counts.
 */
export function useSubCategory(): string | null {
    const { sc } = useQuery();

    if (Array.isArray(sc)) {
        return sc[0] ?? null;
    }
    return sc ?? null;
}

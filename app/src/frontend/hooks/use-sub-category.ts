// Reads the `sc` (sub-category) query parameter through react-router, so it works on the server as well
// as in the browser. Fix for docs/tickets/building-view/issues/01-server-render-building-route-window.md.
import { useQuery } from './use-query';

/**
 * The `sc` query parameter as a string, or null when absent.
 *
 * Keeps the contract of `URLSearchParams.get('sc')`, which the data containers used before: the first
 * value wins when the parameter is repeated.
 */
export function useSubCategory(): string | null {
    const { sc } = useQuery();

    if (Array.isArray(sc)) {
        return sc[0] ?? null;
    }
    return sc ?? null;
}

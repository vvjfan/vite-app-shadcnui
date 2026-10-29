/**
 * URL search-param contract for the dashboard route. The task-queue list state
 * (search text + exceptions filter) lives in the URL so a filtered view is a
 * shareable link. Both keys are optional and are absent from the URL when at
 * their default, which is why every "off" value normalises back to `undefined`
 * rather than to `""` or `false` - a key set to its default would otherwise
 * linger in the address bar forever.
 */

export type DashboardSearch = {
  q?: string
  exceptions?: boolean
}

/**
 * Validates the raw search object handed over by the router.
 *
 * Only `q` and `exceptions` survive: the returned object is built from scratch
 * rather than spread from the input, so a hand-edited or stale link cannot
 * smuggle extra state into the route.
 *
 * `exceptions` accepts the boolean `true` and the string `"true"` because the
 * router gives back a parsed boolean when it can parse the value and the raw
 * string when it cannot. Anything else (including `false` and `"false"`) is the
 * default, so it collapses to `undefined`.
 */
export function parseDashboardSearch(
  search: Record<string, unknown>
): DashboardSearch {
  return {
    q:
      typeof search.q === "string" && search.q.length > 0
        ? search.q
        : undefined,
    exceptions:
      search.exceptions === true || search.exceptions === "true"
        ? true
        : undefined,
  }
}

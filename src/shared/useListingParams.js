import { useSearchParams } from "react-router-dom";
import {
  DIRECTION_PARAM,
  PAGE_PARAM,
  SORT_PARAM,
  parseListingParams,
} from "../lib/listing";

// Sort, direction and page of a list, kept in the URL query string
// (`?orden=…&dir=…&pagina=…`). Default values are left out of the URL, and
// every change replaces the current history entry: re-sorting or paging is
// view state, not a navigation the back button should step through.
// Changing the sort or the direction goes back to page 1.
function useListingParams({ sortKeys, defaultSort, defaultDirection }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseListingParams(searchParams, {
    sortKeys,
    defaultSort,
    defaultDirection,
  });

  function update(changes) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null) next.delete(key);
          else next.set(key, value);
        });
        return next;
      },
      { replace: true },
    );
  }

  return {
    ...params,
    setSort: (sort) =>
      update({
        [SORT_PARAM]: sort === defaultSort ? null : sort,
        [PAGE_PARAM]: null,
      }),
    setDirection: (direction) =>
      update({
        [DIRECTION_PARAM]: direction === defaultDirection ? null : direction,
        [PAGE_PARAM]: null,
      }),
    setPage: (page) => update({ [PAGE_PARAM]: page > 1 ? String(page) : null }),
  };
}

export default useListingParams;

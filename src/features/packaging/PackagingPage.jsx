import { useEffect, useState } from "react";
import useRecipeStore from "../../stores/useRecipeStore";
import useToastStore from "../../stores/useToastStore";
import { stockValue } from "../../lib/stock";
import { CUSTOM_SORT, pageOfIndex, paginate, sortBy } from "../../lib/listing";
import useListingParams from "../../shared/useListingParams";
import ConfirmDialog from "../../shared/ConfirmDialog";
import PackagingView from "./PackagingView";
import PackagingModal from "./PackagingModal";
import {
  PACKAGING_PER_PAGE,
  packagingListingDefaults,
  packagingSortOptions,
  packagingSortValue,
} from "./packagingListing";

const byName = (item) => item.name;

// Container of the packaging view: search, sort and pagination (sort and page
// live in the URL), create/edit modal and the delete confirmation. Same
// behavior as the ingredients view.
function PackagingPage() {
  const packaging = useRecipeStore((state) => state.packaging);
  const addPackaging = useRecipeStore((state) => state.addPackaging);
  const updatePackaging = useRecipeStore((state) => state.updatePackaging);
  const deletePackaging = useRecipeStore((state) => state.deletePackaging);
  const reorderPackaging = useRecipeStore((state) => state.reorderPackaging);
  const movePackaging = useRecipeStore((state) => state.movePackaging);
  const showToast = useToastStore((state) => state.showToast);
  const [search, setSearch] = useState("");
  const listing = useListingParams(packagingListingDefaults);
  // null: closed; {}: new item; an item: editing it.
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Search, then sort (name breaks ties; the custom order keeps the stored
  // order), then paginate.
  const filtered = packaging.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
  const sortValue = packagingSortValue(listing.sort);
  const sorted = sortValue
    ? sortBy(sortBy(filtered, byName), sortValue, listing.direction)
    : filtered;
  const pageInfo = paginate(sorted, listing.page, PACKAGING_PER_PAGE);

  // A page beyond the last one (deep link, or after deleting) is shown
  // clamped; this keeps the URL in line with what is shown.
  useEffect(() => {
    if (listing.page !== pageInfo.page) listing.setPage(pageInfo.page);
  }, [listing.page, pageInfo.page]);

  // Moves one position in the full list and, when the item leaves the
  // visible page, follows it so it stays in view.
  function move(id, delta) {
    const target = packaging.findIndex((item) => item.id === id) + delta;
    if (target < 0 || target >= packaging.length) return;
    movePackaging(id, delta);
    const targetPage = pageOfIndex(target, PACKAGING_PER_PAGE);
    if (targetPage !== pageInfo.page) listing.setPage(targetPage);
  }

  // Only the unfiltered custom order can be rearranged: there the visible
  // order is the stored order.
  const reorder =
    listing.sort === CUSTOM_SORT && search === ""
      ? {
          onReorder: reorderPackaging,
          onMove: move,
          firstId: packaging[0]?.id,
          lastId: packaging.at(-1)?.id,
        }
      : null;

  function changeSearch(value) {
    setSearch(value);
    if (listing.page !== 1) listing.setPage(1);
  }

  function save(form) {
    const item = {
      name: form.name,
      packSize: Number(form.packSize),
      packCost: Number(form.packCost),
      stock: stockValue(form.stock),
    };
    if (editing?.id) updatePackaging(editing.id, item);
    else addPackaging(item);
    setEditing(null);
    showToast("Packaging guardado");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deletePackaging(pendingDelete.id);
    showToast("Packaging eliminado");
    setPendingDelete(null);
  }

  return (
    <>
      <PackagingView
        packaging={pageInfo.items}
        matchCount={filtered.length}
        totalCount={packaging.length}
        search={search}
        setSearch={changeSearch}
        sortOptions={packagingSortOptions}
        sort={listing.sort}
        direction={listing.direction}
        onSortChange={listing.setSort}
        onDirectionChange={listing.setDirection}
        page={pageInfo.page}
        pageCount={pageInfo.pageCount}
        onPageChange={listing.setPage}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDelete={(id) =>
          setPendingDelete(packaging.find((item) => item.id === id) ?? null)
        }
        reorder={reorder}
      />
      {editing !== null && (
        <PackagingModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar packaging"
        description={`¿Eliminar "${pendingDelete?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default PackagingPage;

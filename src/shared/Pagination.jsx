import { ChevronLeft, ChevronRight } from "lucide-react";

// Above this many pages only previous/next are shown, not every page number.
const MAX_PAGE_BUTTONS = 7;

// Previous/next pagination with "Página X de Y". Renders nothing when
// everything fits on one page.
function Pagination({ page, pageCount, onPageChange, className = "" }) {
  if (pageCount <= 1) return null;
  const pages =
    pageCount <= MAX_PAGE_BUTTONS
      ? Array.from({ length: pageCount }, (_, index) => index + 1)
      : [];

  return (
    <nav className={`pagination ${className}`} aria-label="Paginación">
      <button
        type="button"
        className="pagination-step"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft size={15} /> Anterior
      </button>
      {pages.length > 0 && (
        <span className="pagination-pages">
          {pages.map((number) => (
            <button
              type="button"
              key={number}
              className="pagination-page"
              aria-label={`Página ${number}`}
              aria-current={number === page ? "page" : undefined}
              onClick={() => onPageChange(number)}
            >
              {number}
            </button>
          ))}
        </span>
      )}
      <span className="pagination-status">
        Página {page} de {pageCount}
      </span>
      <button
        type="button"
        className="pagination-step"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        Siguiente <ChevronRight size={15} />
      </button>
    </nav>
  );
}

export default Pagination;

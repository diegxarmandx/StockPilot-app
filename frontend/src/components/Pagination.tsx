import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  size,
  totalElements,
  totalPages,
  onPage,
}: {
  page: number
  size: number
  totalElements: number
  totalPages: number
  onPage: (page: number) => void
}) {
  const start = totalElements === 0 || page * size >= totalElements ? 0 : page * size + 1
  return (
    <div className="pagination">
      <p>
        <strong>
          {start}–{Math.min((page + 1) * size, totalElements)}
        </strong>{' '}
        of <strong>{totalElements}</strong> records
      </p>
      <div className="flex items-center gap-3">
        <span>
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

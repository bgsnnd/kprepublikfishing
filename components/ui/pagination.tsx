'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type PaginationProps = {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  disabled?: boolean
  className?: string
}

function getPageRange(
  current: number,
  total: number,
  siblings: number = 1,
): (number | 'ellipsis')[] {
  const totalNumbers = siblings * 2 + 5
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const leftSibling = Math.max(current - siblings, 1)
  const rightSibling = Math.min(current + siblings, total)
  const showLeftEllipsis = leftSibling > 2
  const showRightEllipsis = rightSibling < total - 1
  const pages: (number | 'ellipsis')[] = []

  if (!showLeftEllipsis) {
    for (let i = 1; i <= rightSibling + 1; i++) pages.push(i)
    if (showRightEllipsis) {
      pages.push('ellipsis')
      pages.push(total)
    }
  } else if (!showRightEllipsis) {
    pages.push(1)
    pages.push('ellipsis')
    for (let i = leftSibling - 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('ellipsis')
    for (let i = leftSibling; i <= rightSibling; i++) pages.push(i)
    pages.push('ellipsis')
    pages.push(total)
  }

  return pages
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  if (totalPages <= 0) return null

  const pages = getPageRange(currentPage, totalPages)
  const startIdx = (currentPage - 1) * perPage + 1
  const endIdx = Math.min(currentPage * perPage, totalItems)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3',
        className,
      )}
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {startIdx}–{endIdx} dari {totalItems}
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Baris:</span>
            <Select
              value={String(perPage)}
              onValueChange={(v: string | null) => {
                const n = Number(v ?? perPage)
                onPerPageChange(n)
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n: number) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || disabled}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p: number | 'ellipsis', idx: number) => {
          if (p === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-8 items-center justify-center"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </span>
            )
          }

          const isActive = p === currentPage
          return (
            <Button
              key={p}
              variant={isActive ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8 text-xs tabular-nums"
              onClick={() => onPageChange(p)}
              disabled={disabled}
              aria-current={isActive ? 'page' : undefined}
            >
              {p}
            </Button>
          )
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || disabled}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
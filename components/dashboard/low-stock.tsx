import Link from 'next/link'
import { AlertTriangle, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { LowStockProduct } from '@/lib/dashboard/queries'

type LowStockProps = {
  products: LowStockProduct[]
}

export function LowStock({ products }: LowStockProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Stok Menipis
        </CardTitle>
        <Link
          href="/admin/inventory"
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          Lihat semua →
        </Link>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Semua stok aman
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.categoryName}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="tabular-nums font-mono shrink-0 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                >
                  {p.stock} / {p.minStock}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
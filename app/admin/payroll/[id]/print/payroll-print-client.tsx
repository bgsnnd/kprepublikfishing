'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================
// Types
// ============================================================

type PayrollDetail = {
  id: string
  periodMonth: number
  periodYear: number
  periodStart: Date
  periodEnd: Date
  workingDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  totalLateMinutes: number
  totalWorkMinutes: number
  grossEarning: number
  totalDeduction: number
  netSalary: number
  status: string
  approvedAt: Date | null
  paidAt: Date | null
  createdAt: Date
  user: {
    id: string
    username: string
    name: string
    employeeType: { name: string } | null
  }
  items: {
    id: string
    componentCode: string
    componentName: string
    componentType: string
    calcMethod: string
    baseAmount: number
    quantity: number | null
    finalAmount: number
    notes: string | null
  }[]
}

type Props = {
  payroll: PayrollDetail
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// ============================================================
// Component
// ============================================================

export function PayrollPrintClient({ payroll }: Props) {
  const router = useRouter()

  const earnings = payroll.items.filter((i) => i.componentType === 'EARNING')
  const deductions = payroll.items.filter((i) => i.componentType === 'DEDUCTION')

  function formatRp(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID')
  }

  function formatDate(d: Date | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatDateTime(d: Date | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function handlePrint() {
    window.print()
  }

  // Auto-open print dialog
  useEffect(() => {
    // Delay sedikit biar render kelar dulu
    const timer = setTimeout(() => {
      // Uncomment kalau mau auto-print:
      // window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          @page {
            size: A5;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Toolbar — gak ke-print */}
      <div className="no-print sticky top-0 z-40 bg-background border-b">
        <div className="container mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/payroll/${payroll.id}`)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <span className="text-sm font-medium">Slip Gaji</span>
          </div>
          <Button onClick={handlePrint} size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
        </div>
      </div>

      {/* Slip Gaji */}
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="print-container bg-white text-black rounded-lg border shadow-sm">
          <div className="p-8">
            {/* Header */}
            <div className="text-center pb-4 border-b-2 border-black">
              <h1 className="text-xl font-bold tracking-wide">
                KP REPUBLIK FISHING
              </h1>
              <p className="text-xs mt-1 text-gray-600">
                Slip Gaji Karyawan
              </p>
            </div>

            {/* Info Karyawan */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 py-4 border-b text-sm">
              <InfoRow label="Nama" value={payroll.user.name} />
              <InfoRow label="Username" value={`@${payroll.user.username}`} />
              <InfoRow
                label="Tipe"
                value={payroll.user.employeeType?.name ?? '—'}
              />
              <InfoRow
                label="Periode"
                value={`${MONTHS[payroll.periodMonth - 1]} ${payroll.periodYear}`}
              />
              <InfoRow
                label="Tanggal"
                value={`${formatDate(payroll.periodStart)} – ${formatDate(payroll.periodEnd)}`}
              />
              <InfoRow
                label="Status"
                value={
                  payroll.status === 'DRAFT'
                    ? 'Draft'
                    : payroll.status === 'APPROVED'
                      ? 'Disetujui'
                      : payroll.status === 'PAID'
                        ? 'Dibayar'
                        : payroll.status
                }
              />
            </div>

            {/* Snapshot Absensi */}
            <div className="py-4 border-b">
              <h2 className="text-xs font-bold uppercase tracking-wide mb-2">
                Ringkasan Absensi
              </h2>
              <div className="grid grid-cols-4 gap-3 text-xs">
                <SnapshotBox label="Hari Kerja" value={`${payroll.workingDays}`} />
                <SnapshotBox
                  label="Hadir"
                  value={`${payroll.presentDays}`}
                  tone="success"
                />
                <SnapshotBox
                  label="Alpha"
                  value={`${payroll.absentDays}`}
                  tone={payroll.absentDays > 0 ? 'danger' : undefined}
                />
                <SnapshotBox
                  label="Telat"
                  value={`${payroll.totalLateMinutes}m`}
                  tone={payroll.totalLateMinutes > 0 ? 'warning' : undefined}
                />
              </div>
            </div>

            {/* Pendapatan */}
            {earnings.length > 0 && (
              <div className="py-4 border-b">
                <h2 className="text-xs font-bold uppercase tracking-wide mb-2">
                  Pendapatan
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    {earnings.map((item) => (
                      <tr key={item.id} className="border-b border-dashed">
                        <td className="py-1.5 pr-2">
                          <div className="font-medium">{item.componentName}</div>
                          {item.notes && (
                            <div className="text-[10px] text-gray-500">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                          {formatRp(item.finalAmount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-black">
                      <td className="py-2 font-bold">Total Pendapatan</td>
                      <td className="py-2 text-right font-bold tabular-nums">
                        {formatRp(payroll.grossEarning)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Potongan */}
            {deductions.length > 0 && (
              <div className="py-4 border-b">
                <h2 className="text-xs font-bold uppercase tracking-wide mb-2">
                  Potongan
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    {deductions.map((item) => (
                      <tr key={item.id} className="border-b border-dashed">
                        <td className="py-1.5 pr-2">
                          <div className="font-medium">{item.componentName}</div>
                          {item.notes && (
                            <div className="text-[10px] text-gray-500">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                          −{formatRp(item.finalAmount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-black">
                      <td className="py-2 font-bold">Total Potongan</td>
                      <td className="py-2 text-right font-bold tabular-nums">
                        −{formatRp(payroll.totalDeduction)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Gaji Bersih */}
            <div className="py-4">
              <div className="flex items-center justify-between bg-black text-white px-4 py-3 rounded">
                <span className="text-sm font-bold uppercase tracking-wide">
                  Gaji Bersih
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {formatRp(payroll.netSalary)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t text-xs text-gray-500 flex items-center justify-between">
              <span>
                Dicetak: {formatDateTime(new Date())}
              </span>
              <span>
                {payroll.approvedAt &&
                  `Disetujui: ${formatDateTime(payroll.approvedAt)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================
// Sub-components
// ============================================================

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-gray-500 w-20 shrink-0">{label}</span>
      <span className="font-medium">: {value}</span>
    </div>
  )
}

function SnapshotBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'warning' | 'danger'
}) {
  return (
    <div className="text-center py-2 px-1 border rounded">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div
        className={
          'text-sm font-bold tabular-nums mt-0.5 ' +
          (tone === 'success'
            ? 'text-emerald-600'
            : tone === 'warning'
              ? 'text-amber-600'
              : tone === 'danger'
                ? 'text-red-600'
                : '')
        }
      >
        {value}
      </div>
    </div>
  )
}
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/auth/context'
import { getPayrollDetail } from '@/lib/payroll/queries'
import { PayrollPrintClient } from './payroll-print-client'

export const metadata = {
  title: 'Slip Gaji',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PayrollPrintPage({ params }: PageProps) {
  await requirePermission('payroll.read')

  const { id } = await params
  const payroll = await getPayrollDetail(id)

  if (!payroll) notFound()

  return <PayrollPrintClient payroll={payroll} />
}
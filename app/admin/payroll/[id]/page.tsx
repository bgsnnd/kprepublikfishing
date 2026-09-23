import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/auth/context'
import { getPayrollDetail } from '@/lib/payroll/queries'
import { PayrollDetailClient } from './payroll-detail-client'

export const metadata = {
  title: 'Detail Payroll',
}

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PayrollDetailPage({ params }: PageProps) {
  await requirePermission('payroll.read')

  const { id } = await params
  const payroll = await getPayrollDetail(id)

  if (!payroll) notFound()

  return <PayrollDetailClient payroll={payroll} />
}
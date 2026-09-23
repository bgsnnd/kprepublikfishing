import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
          <ShieldX className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Akses Ditolak
        </h1>
        <p className="text-gray-600 mb-6">
          Anda tidak punya izin untuk mengakses halaman ini.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium px-6 py-2.5 rounded-lg transition"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  )
}
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RecentActivity as Activity } from '@/lib/dashboard/queries'

type RecentActivityProps = {
  activities: Activity[]
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-green-500/15 text-green-700 dark:text-green-400',
  UPDATE: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  DELETE: 'bg-red-500/15 text-red-700 dark:text-red-400',
  LOGIN: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  LOGOUT: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  APPROVE: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Belum ada aktivitas
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 text-sm"
              >
                <Badge
                  variant="secondary"
                  className={`shrink-0 font-mono text-[10px] ${
                    ACTION_COLOR[a.action] ?? ''
                  }`}
                >
                  {a.action}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    <span className="font-medium">{a.userName ?? a.userEmail ?? 'System'}</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {a.action.toLowerCase()} {a.entity}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(a.createdAt, {
                      addSuffix: true,
                      locale: localeId,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkUserRole } from '@/lib/auth/check-role'
import { SyncProvider } from '@/contexts/sync-context'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const hasAccess = await checkUserRole(user.id)
  
  if (!hasAccess) {
    redirect('/access-denied')
  }

  return (
    <SyncProvider>
      {children}
    </SyncProvider>
  )
}

'use client'

import { Settings, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/templates/app-layout'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AppLayout title="Settings" showQueue={false}>
      <div className="flex flex-col min-h-[60vh] p-4">
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div className="rounded-full bg-muted p-6">
            <Settings className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-muted-foreground text-center">
            App settings coming soon
          </p>
        </div>
        
        <div className="mt-auto pt-8">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

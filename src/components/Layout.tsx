import { Link, Outlet } from 'react-router-dom'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'

function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            CertPrep
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/history" aria-label="View history">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">History</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout

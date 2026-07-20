import { Sidebar } from './sidebar'
import { MainContent } from './main-content'

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="w-screen h-screen bg-white flex overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      {children ?? <MainContent />}
    </div>
  )
}

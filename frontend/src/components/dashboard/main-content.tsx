import { ContentGrid } from './content-grid'

export function MainContent() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <ContentGrid />
      </div>
    </div>
  )
}


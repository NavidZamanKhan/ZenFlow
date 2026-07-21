import { ContentGrid } from './content-grid'

export function MainContent() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-auto">
        <ContentGrid />
      </div>
    </div>
  )
}


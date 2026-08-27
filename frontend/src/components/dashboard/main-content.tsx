import { ContentGrid } from './content-grid'

export function MainContent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[var(--zf-canvas)]">
      <div className="min-h-0 flex-1 overflow-auto">
        <ContentGrid />
      </div>
    </div>
  )
}

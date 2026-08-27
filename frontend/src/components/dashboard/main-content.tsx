import { ContentGrid } from './content-grid'

export function MainContent() {
  return (
    <div className="flex-1 bg-white dark:bg-[var(--zf-canvas)] lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
        <ContentGrid />
      </div>
    </div>
  )
}

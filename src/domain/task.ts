export interface Task {
  id: string
  title: string
  completed: boolean
}

export type TaskFilter = 'all' | 'open' | 'done'

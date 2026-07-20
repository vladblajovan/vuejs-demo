import type { Task } from '@/domain/task'

export const mockTasks: Task[] = [
  { id: 'task-repository-tests', title: 'Write tests for task repo', completed: false },
  { id: 'task-add-flow', title: 'Ship add task flow', completed: true },
]

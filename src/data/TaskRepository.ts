import type { Task } from '@/domain/task'

export interface TaskRepository {
  list(): Promise<Task[]>
  create(title: string): Promise<Task>
  toggle(id: string): Promise<Task>
}

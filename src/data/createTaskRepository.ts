import { HttpTaskRepository } from '@/data/HttpTaskRepository'
import type { TaskRepository } from '@/data/TaskRepository'

export function createTaskRepository(
  endpoint: string = import.meta.env.VITE_API_URL ?? '/api/tasks',
): TaskRepository {
  return new HttpTaskRepository(endpoint)
}

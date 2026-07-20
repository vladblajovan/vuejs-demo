import type { TaskRepository } from '@/data/TaskRepository'
import type { Task } from '@/domain/task'

export class FakeTaskRepository implements TaskRepository {
  readonly createdTitles: string[] = []
  private tasks: Task[]

  constructor(tasks: Task[] = []) {
    this.tasks = tasks.map((task) => ({ ...task }))
  }

  async list(): Promise<Task[]> {
    return this.tasks.map((task) => ({ ...task }))
  }

  async create(title: string): Promise<Task> {
    this.createdTitles.push(title)
    const task = { id: `fake-${this.tasks.length + 1}`, title, completed: false }
    this.tasks.push(task)
    return { ...task }
  }

  async toggle(id: string): Promise<Task> {
    const task = this.tasks.find((candidate) => candidate.id === id)
    if (!task) throw new Error(`Task "${id}" was not found`)

    task.completed = !task.completed
    return { ...task }
  }
}

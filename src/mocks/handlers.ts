import { delay, http, HttpResponse } from 'msw'

import { mockTasks } from '@/data/mockTasks'
import type { Task } from '@/domain/task'

const cloneTasks = (tasks: Task[]) => tasks.map((task) => ({ ...task }))
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(16).slice(2)}`

let tasks = cloneTasks(mockTasks)

export function resetMockTasks() {
  tasks = cloneTasks(mockTasks)
}

export const handlers = [
  http.get('*/api/tasks', async () => {
    await delay(120)
    return HttpResponse.json(cloneTasks(tasks))
  }),

  http.post('*/api/tasks', async ({ request }) => {
    const body = (await request.json()) as { title?: unknown }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return HttpResponse.json({ message: 'A task title is required' }, { status: 400 })

    const task: Task = { id: makeId(), title, completed: false }
    tasks.push(task)
    await delay(120)
    return HttpResponse.json({ ...task }, { status: 201 })
  }),

  http.patch('*/api/tasks/:id/toggle', async ({ params }) => {
    const task = tasks.find((candidate) => candidate.id === params.id)
    if (!task) return HttpResponse.json({ message: 'Task not found' }, { status: 404 })

    task.completed = !task.completed
    await delay(120)
    return HttpResponse.json({ ...task })
  }),
]

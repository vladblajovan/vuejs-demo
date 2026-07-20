import { describe, expect, it } from 'vitest'

import { useTasks } from '@/composables/useTasks'
import { FakeTaskRepository } from '@/testing/FakeTaskRepository'

describe('useTasks', () => {
  it('owns task state while delegating persistence to a repository', async () => {
    const repository = new FakeTaskRepository([
      { id: '1', title: 'Open task', completed: false },
      { id: '2', title: 'Completed task', completed: true },
    ])
    const tasks = useTasks(repository)

    await tasks.load()
    expect(tasks.counts.value).toEqual({ all: 2, open: 1, done: 1 })
    expect(tasks.progress.value).toBe(50)
    expect(tasks.nextTask.value?.title).toBe('Open task')
    expect(tasks.activity.value[0]).toMatchObject({ kind: 'loaded', title: '2 tasks ready' })
    expect(tasks.lastRequest.value).toMatchObject({ method: 'GET', endpoint: '/api/tasks' })

    tasks.filter.value = 'done'
    expect(tasks.visibleTasks.value.map((task) => task.title)).toEqual(['Completed task'])

    await tasks.toggle('1')
    expect(tasks.counts.value).toEqual({ all: 2, open: 0, done: 2 })
    expect(tasks.progress.value).toBe(100)
    expect(tasks.nextTask.value).toBeNull()
    expect(tasks.activity.value[0]).toMatchObject({ kind: 'completed', title: 'Open task' })
    expect(tasks.lastRequest.value).toMatchObject({
      method: 'PATCH',
      endpoint: '/api/tasks/1/toggle',
    })
  })

  it('fans one created task out to every derived view', async () => {
    const tasks = useTasks(
      new FakeTaskRepository([
        { id: '1', title: 'Open task', completed: false },
        { id: '2', title: 'Completed task', completed: true },
      ]),
    )

    await tasks.load()
    await tasks.add('Ship the shared state')

    expect(tasks.counts.value).toEqual({ all: 3, open: 2, done: 1 })
    expect(tasks.progress.value).toBe(33)
    expect(tasks.tasks.value[0]?.title).toBe('Ship the shared state')
    expect(tasks.nextTask.value?.title).toBe('Ship the shared state')
    expect(tasks.activity.value[0]).toMatchObject({
      kind: 'created',
      title: 'Ship the shared state',
    })
    expect(tasks.lastRequest.value).toMatchObject({ method: 'POST', endpoint: '/api/tasks' })
  })
})

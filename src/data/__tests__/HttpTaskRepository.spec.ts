import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { HttpTaskRepository } from '@/data/HttpTaskRepository'
import { handlers, resetMockTasks } from '@/mocks/handlers'

const server = setupServer(...handlers)

describe('HttpTaskRepository', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(resetMockTasks)
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('uses the REST API to list, create, and toggle tasks', async () => {
    const repository = new HttpTaskRepository('http://localhost/api/tasks')

    expect(await repository.list()).toContainEqual({
      id: 'task-repository-tests',
      title: 'Write tests for task repo',
      completed: false,
    })

    const created = await repository.create('Ship the REST demo')
    expect(created).toMatchObject({ title: 'Ship the REST demo', completed: false })

    expect(await repository.toggle(created.id)).toEqual({ ...created, completed: true })
    expect(await repository.list()).toContainEqual({ ...created, completed: true })
  })

  it('surfaces an API error message', async () => {
    server.use(
      http.get('*/api/tasks', () =>
        HttpResponse.json({ message: 'The mock API is offline' }, { status: 503 }),
      ),
    )

    const repository = new HttpTaskRepository('http://localhost/api/tasks')

    await expect(repository.list()).rejects.toThrow('The mock API is offline')
  })
})

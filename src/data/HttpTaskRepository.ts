import type { TaskRepository } from '@/data/TaskRepository'
import type { Task } from '@/domain/task'

interface ApiError {
  message?: string
}

export class HttpTaskRepository implements TaskRepository {
  constructor(
    private readonly endpoint = '/api/tasks',
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  list(): Promise<Task[]> {
    return this.request<Task[]>()
  }

  create(title: string): Promise<Task> {
    return this.request<Task>('', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim() }),
    })
  }

  toggle(id: string): Promise<Task> {
    return this.request<Task>(`/${encodeURIComponent(id)}/toggle`, { method: 'PATCH' })
  }

  private async request<T>(path = '', init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.endpoint}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    const body = (await response.json().catch(() => null)) as ApiError | T | null

    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : undefined
      throw new Error(message ?? `The API request failed with status ${response.status}`)
    }

    return body as T
  }
}

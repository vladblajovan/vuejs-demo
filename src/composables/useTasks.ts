import { computed, ref } from 'vue'

import type { TaskRepository } from '@/data/TaskRepository'
import type { Task, TaskFilter } from '@/domain/task'

export interface TaskActivity {
  id: string
  kind: 'loaded' | 'created' | 'completed' | 'reopened'
  title: string
  detail: string
}

export interface TaskRequestTrace {
  method: 'GET' | 'POST' | 'PATCH'
  endpoint: string
  label: string
  status: 'pending' | 'success' | 'error'
}

export function useTasks(repository: TaskRepository) {
  const tasks = ref<Task[]>([])
  const filter = ref<TaskFilter>('all')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const activity = ref<TaskActivity[]>([])
  const lastRequest = ref<TaskRequestTrace>({
    method: 'GET',
    endpoint: '/api/tasks',
    label: 'Load tasks',
    status: 'pending',
  })
  let activitySequence = 0

  const visibleTasks = computed(() => {
    if (filter.value === 'open') return tasks.value.filter((task) => !task.completed)
    if (filter.value === 'done') return tasks.value.filter((task) => task.completed)
    return tasks.value
  })

  const counts = computed(() => ({
    all: tasks.value.length,
    open: tasks.value.filter((task) => !task.completed).length,
    done: tasks.value.filter((task) => task.completed).length,
  }))

  const progress = computed(() =>
    counts.value.all === 0 ? 0 : Math.round((counts.value.done / counts.value.all) * 100),
  )

  const nextTask = computed(() => tasks.value.find((task) => !task.completed) ?? null)

  function recordActivity(activityItem: Omit<TaskActivity, 'id'>) {
    activity.value.unshift({ ...activityItem, id: `activity-${++activitySequence}` })
    activity.value = activity.value.slice(0, 4)
  }

  async function run(operation: () => Promise<void>): Promise<boolean> {
    error.value = null
    try {
      await operation()
      return true
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Something went wrong'
      return false
    }
  }

  async function load() {
    isLoading.value = true
    lastRequest.value = {
      method: 'GET',
      endpoint: '/api/tasks',
      label: 'Load tasks',
      status: 'pending',
    }
    const succeeded = await run(async () => {
      tasks.value = await repository.list()
      recordActivity({
        kind: 'loaded',
        title: `${tasks.value.length} tasks ready`,
        detail: 'Loaded from GET /api/tasks',
      })
    })
    lastRequest.value.status = succeeded ? 'success' : 'error'
    isLoading.value = false
  }

  async function add(title: string) {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    lastRequest.value = {
      method: 'POST',
      endpoint: '/api/tasks',
      label: trimmedTitle,
      status: 'pending',
    }
    const succeeded = await run(async () => {
      const created = await repository.create(trimmedTitle)
      tasks.value.unshift(created)
      recordActivity({ kind: 'created', title: created.title, detail: 'Task added · Just now' })
    })
    lastRequest.value.status = succeeded ? 'success' : 'error'
  }

  async function toggle(id: string) {
    const current = tasks.value.find((task) => task.id === id)
    lastRequest.value = {
      method: 'PATCH',
      endpoint: `/api/tasks/${encodeURIComponent(id)}/toggle`,
      label: current?.title ?? 'Toggle task',
      status: 'pending',
    }
    const succeeded = await run(async () => {
      const updated = await repository.toggle(id)
      const index = tasks.value.findIndex((task) => task.id === id)
      if (index >= 0) tasks.value[index] = updated
      recordActivity({
        kind: updated.completed ? 'completed' : 'reopened',
        title: updated.title,
        detail: `${updated.completed ? 'Task completed' : 'Task reopened'} · Just now`,
      })
    })
    lastRequest.value.status = succeeded ? 'success' : 'error'
  }

  return {
    tasks,
    visibleTasks,
    counts,
    progress,
    nextTask,
    activity,
    lastRequest,
    filter,
    isLoading,
    error,
    load,
    add,
    toggle,
  }
}

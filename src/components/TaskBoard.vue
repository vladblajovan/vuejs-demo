<script setup lang="ts">
import { ref } from 'vue'

import type { Task, TaskFilter } from '@/domain/task'

defineProps<{
  tasks: Task[]
  counts: { all: number; open: number; done: number }
  filter: TaskFilter
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  add: [title: string]
  toggle: [id: string]
  'update:filter': [filter: TaskFilter]
}>()

const newTask = ref('')

function submit() {
  const title = newTask.value.trim()
  if (!title) return
  emit('add', title)
  newTask.value = ''
}
</script>

<template>
  <div class="task-board">
    <header class="task-board__header">
      <h2>My tasks</h2>
    </header>

    <div class="task-board__body">
      <form class="task-form" data-test="add-task" @submit.prevent="submit">
        <label class="sr-only" for="new-task">Add a task</label>
        <input
          id="new-task"
          v-model="newTask"
          data-test="new-task"
          placeholder="Add a task"
          autocomplete="off"
        />
        <button class="button button--primary" type="submit">Add task</button>
      </form>

      <div class="filters" aria-label="Filter tasks">
        <button
          v-for="item in ['all', 'open', 'done'] as TaskFilter[]"
          :key="item"
          type="button"
          :class="{ active: filter === item }"
          :aria-pressed="filter === item"
          :data-test="`filter-${item}`"
          @click="emit('update:filter', item)"
        >
          {{ item }} <span>({{ counts[item] }})</span>
        </button>
      </div>

      <div v-if="isLoading" class="task-state">Loading tasks from the REST API…</div>
      <div v-else-if="error" class="task-state task-state--error">{{ error }}</div>
      <ul v-else class="task-list">
        <li v-for="task in tasks" :key="task.id" :class="{ completed: task.completed }">
          <button
            class="task-check"
            type="button"
            :aria-label="`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`"
            @click="emit('toggle', task.id)"
          >
            <svg v-if="task.completed" viewBox="0 0 16 16" aria-hidden="true">
              <path d="m3 8 3 3 7-7" />
            </svg>
          </button>
          <span class="task-title">{{ task.title }}</span>
          <span class="task-status">{{ task.completed ? 'Done' : 'Open' }}</span>
        </li>
      </ul>

      <p class="task-summary">
        {{ counts.all }} tasks · {{ counts.open }} open · {{ counts.done }} done
      </p>
    </div>
  </div>
</template>

<style scoped>
.task-board {
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: #fff;
  box-shadow: var(--shadow-lg);
}

.task-board__header {
  padding: 1.4rem 1.6rem 0;
}

.task-board__header h2 {
  margin: 0;
  font-size: 1.08rem;
  letter-spacing: -0.025em;
}

.task-board__body {
  padding: 1rem 1.6rem 1.45rem;
}

.task-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
}

.task-form input {
  min-width: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xs);
  padding: 0.85rem 0.9rem;
  color: var(--ink);
  background: #fff;
  font: 600 0.86rem/1.2 var(--font-sans);
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.task-form input:focus {
  border-color: var(--vue);
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.13);
}

.filters {
  display: flex;
  gap: 0.45rem;
  margin: 1rem 0 0.7rem;
}

.filters button {
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 0.5rem 0.72rem;
  color: var(--ink-soft);
  background: #fff;
  font: 700 0.72rem/1 var(--font-sans);
  text-transform: capitalize;
  cursor: pointer;
}

.filters button span {
  margin-left: 0.2rem;
  color: var(--muted);
}

.filters button.active {
  border-color: var(--vue);
  color: var(--vue-dark);
  box-shadow: inset 0 0 0 1px var(--vue);
}

.task-list {
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  list-style: none;
}

.task-list li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  min-height: 3.25rem;
  padding: 0 0.85rem;
  border-bottom: 1px solid var(--border);
  transition: background 160ms ease;
}

.task-list li:last-child {
  border-bottom: 0;
}
.task-list li:hover {
  background: var(--mint-soft);
}

.task-check {
  display: grid;
  place-items: center;
  width: 1.2rem;
  height: 1.2rem;
  padding: 0;
  border: 1.5px solid #aab6c8;
  border-radius: 0.25rem;
  background: #fff;
  color: #fff;
  cursor: pointer;
}

.completed .task-check {
  border-color: var(--vue-dark);
  background: var(--vue-dark);
}

.task-check svg {
  width: 0.72rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.task-title {
  font-size: 0.85rem;
  font-weight: 650;
}
.completed .task-title {
  color: var(--muted);
  text-decoration: line-through;
}

.task-status {
  border: 1px solid #c9dff8;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  color: var(--cobalt);
  background: #eff7ff;
  font-size: 0.67rem;
  font-weight: 750;
}

.completed .task-status {
  border-color: #bee8d5;
  color: var(--vue-dark);
  background: var(--mint-soft);
}

.task-state {
  padding: 2rem;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-xs);
  color: var(--muted);
  text-align: center;
}

.task-state--error {
  color: #a23a3a;
}

.task-summary {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.72rem;
}

@media (max-width: 560px) {
  .task-board__header {
    padding: 1.2rem 1rem 0;
  }
  .task-board__body {
    padding: 0.85rem 1rem 1.15rem;
  }
  .task-form {
    grid-template-columns: 1fr;
  }
  .task-form .button {
    width: 100%;
  }
  .filters {
    overflow-x: auto;
  }
  .task-title {
    font-size: 0.8rem;
  }
}
</style>

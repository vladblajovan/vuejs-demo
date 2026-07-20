<script setup lang="ts">
import type { TaskActivity } from '@/composables/useTasks'
import type { Task } from '@/domain/task'

defineProps<{
  tasks: Task[]
  counts: { all: number; open: number; done: number }
  progress: number
  activity: TaskActivity[]
}>()

const emit = defineEmits<{ toggle: [id: string] }>()

const activityLabel = (kind: TaskActivity['kind']) => {
  if (kind === 'created') return 'Task added'
  if (kind === 'completed') return 'Task completed'
  if (kind === 'reopened') return 'Task reopened'
  return 'Tasks loaded'
}
</script>

<template>
  <section
    id="composition"
    class="story-section composition-section"
    aria-labelledby="composition-title"
  >
    <div class="container">
      <div class="section-copy">
        <h2 id="composition-title">One state. Many views.</h2>
        <p>The same state powers every part of your UI.</p>
      </div>

      <div class="projection-graph">
        <div class="state-backbone">
          <strong>useTasks()</strong>
          <span>Single source of truth</span>
          <span>Reactive state &amp; actions</span>
        </div>

        <div class="view-projections">
          <div class="projection-connectors" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <article class="projection projection--tasks">
            <h3>Task list</h3>
            <div class="mini-filters" aria-hidden="true">
              <span class="active">All ({{ counts.all }})</span>
              <span>Open ({{ counts.open }})</span>
              <span>Done ({{ counts.done }})</span>
            </div>
            <ul>
              <li
                v-for="task in tasks.slice(0, 4)"
                :key="task.id"
                :class="{ completed: task.completed }"
              >
                <button
                  type="button"
                  :aria-label="`${task.completed ? 'Reopen' : 'Complete'} ${task.title} in shared view`"
                  @click="emit('toggle', task.id)"
                >
                  <svg v-if="task.completed" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m3 8 3 3 7-7" />
                  </svg>
                </button>
                <span>{{ task.title }}</span>
                <small>{{ task.completed ? 'Done' : 'Open' }}</small>
              </li>
            </ul>
            <p>{{ counts.all }} tasks · {{ counts.open }} open · {{ counts.done }} done</p>
          </article>

          <article class="projection projection--progress">
            <h3>Progress</h3>
            <div class="progress-ring" :style="{ '--progress': progress }">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle class="progress-ring__track" cx="60" cy="60" r="48" />
                <circle
                  class="progress-ring__value"
                  cx="60"
                  cy="60"
                  r="48"
                  :style="{ strokeDashoffset: 302 - (302 * progress) / 100 }"
                />
              </svg>
              <div>
                <strong>{{ progress }}%</strong><span>Complete</span>
              </div>
            </div>
            <dl>
              <div>
                <dt><i class="done"></i>Done</dt>
                <dd>{{ counts.done }}</dd>
              </div>
              <div>
                <dt><i></i>Open</dt>
                <dd>{{ counts.open }}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{{ counts.all }}</dd>
              </div>
            </dl>
          </article>

          <article class="projection projection--activity">
            <h3>Recent activity</h3>
            <ol>
              <li
                v-for="(item, index) in activity"
                :key="item.id"
                :data-test="index === 0 ? 'activity-latest' : undefined"
              >
                <i :class="`activity-${item.kind}`"></i>
                <div>
                  <strong>{{ activityLabel(item.kind) }}</strong>
                  <span>{{ item.title }}</span>
                  <small>{{ item.detail }}</small>
                </div>
              </li>
            </ol>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

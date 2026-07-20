<script setup lang="ts">
import type { Task } from '@/domain/task'

defineProps<{
  counts: { all: number; open: number; done: number }
  progress: number
  nextTask: Task | null
}>()
</script>

<template>
  <section
    id="reactivity"
    class="story-section reactivity-section"
    aria-labelledby="reactivity-title"
  >
    <div class="container">
      <div class="reactivity-intro">
        <div>
          <h2 id="reactivity-title">One action. Many reactions.</h2>
          <p>Add a task and watch everything update.</p>
        </div>

        <div class="computed-panel">
          <header>
            <span>Computed in useTasks</span>
            <span aria-hidden="true">&lt;/&gt;</span>
          </header>
          <pre><code><span>const</span> totalCount = computed(() =&gt; tasks.value.length)
<span>const</span> openCount = computed(() =&gt;
  tasks.value.filter(task =&gt; !task.completed).length
)
<span>const</span> progress = computed(() =&gt;
  Math.round((doneCount.value / totalCount.value) * 100)
)
<span>const</span> nextTask = computed(() =&gt;
  tasks.value.find(task =&gt; !task.completed) ?? null
)</code></pre>
        </div>
      </div>

      <div class="insight-rail" aria-label="Reactive task insights">
        <article data-test="insight-total">
          <span class="insight-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
            </svg>
          </span>
          <h3>Total tasks</h3>
          <strong>{{ counts.all }}</strong>
          <p>Reactive total</p>
        </article>
        <article>
          <span class="insight-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" /></svg>
          </span>
          <h3>Open tasks</h3>
          <strong>{{ counts.open }}</strong>
          <p>Computed open</p>
        </article>
        <article data-test="insight-progress">
          <span class="insight-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 4a8 8 0 1 1-5.66 2.34" />
              <path d="M4 4v5h5" />
            </svg>
          </span>
          <h3>Progress</h3>
          <strong>{{ progress }}%</strong>
          <p>{{ counts.done }} of {{ counts.all }} done</p>
        </article>
        <article>
          <span class="insight-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
          </span>
          <h3>Next up</h3>
          <strong class="insight-next">{{ nextTask?.title ?? 'All caught up' }}</strong>
          <p>First incomplete task</p>
        </article>
      </div>
    </div>
  </section>
</template>

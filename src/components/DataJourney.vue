<script setup lang="ts">
import type { TaskRequestTrace } from '@/composables/useTasks'

defineProps<{
  trace: TaskRequestTrace
  counts: { all: number; open: number; done: number }
  progress: number
  transportLabel: string
}>()
</script>

<template>
  <section id="data-flow" class="story-section data-section" aria-labelledby="data-title">
    <div class="container">
      <div class="section-copy">
        <h2 id="data-title">From intent to response.</h2>
        <p>See the exact journey of your latest task action.</p>
      </div>

      <div class="journey" aria-label="Latest task request journey">
        <article>
          <span>1</span>
          <h3>TaskBoard.vue</h3>
          <p>User expresses intent</p>
          <code>{{ trace.label }}</code>
        </article>
        <svg class="journey-arrow" viewBox="0 0 28 18" aria-hidden="true">
          <path d="M1 9h24M19 3l6 6-6 6" />
        </svg>
        <article>
          <span>2</span>
          <h3>useTasks()</h3>
          <p>Updates request state</p>
          <code>status: '{{ trace.status }}'</code>
        </article>
        <svg class="journey-arrow" viewBox="0 0 28 18" aria-hidden="true">
          <path d="M1 9h24M19 3l6 6-6 6" />
        </svg>
        <article>
          <span>3</span>
          <h3>HttpTaskRepository</h3>
          <p>Sends fetch request</p>
          <code data-test="request-method">{{ trace.method }} {{ trace.endpoint }}</code>
        </article>
        <svg class="journey-arrow" viewBox="0 0 28 18" aria-hidden="true">
          <path d="M1 9h24M19 3l6 6-6 6" />
        </svg>
        <article>
          <span>4</span>
          <h3>{{ trace.method }} {{ trace.endpoint }}</h3>
          <p>{{ transportLabel }}</p>
          <code>{{ trace.status === 'success' ? '200 OK · JSON' : trace.status }}</code>
        </article>
        <svg class="journey-arrow" viewBox="0 0 28 18" aria-hidden="true">
          <path d="M1 9h24M19 3l6 6-6 6" />
        </svg>
        <article>
          <span>5</span>
          <h3>Reactive UI</h3>
          <p>Every projection updates</p>
          <ul>
            <li>Task list · {{ counts.all }}</li>
            <li>Open count · {{ counts.open }}</li>
            <li>Progress · {{ progress }}%</li>
          </ul>
        </article>
      </div>

      <div class="request-timeline" aria-label="Request lifecycle">
        <span><i></i><strong>Intent</strong><small>0ms</small></span>
        <span><i></i><strong>State update</strong><small>12ms</small></span>
        <span><i></i><strong>Request sent</strong><small>28ms</small></span>
        <span><i></i><strong>Response received</strong><small>96ms</small></span>
        <span><i></i><strong>UI updated</strong><small>98ms</small></span>
      </div>
    </div>
  </section>
</template>

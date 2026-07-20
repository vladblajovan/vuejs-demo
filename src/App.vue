<script setup lang="ts">
import { onMounted } from 'vue'

import BrandMark from '@/components/BrandMark.vue'
import ConfidenceSection from '@/components/ConfidenceSection.vue'
import DataJourney from '@/components/DataJourney.vue'
import ImplementationGuide from '@/components/ImplementationGuide.vue'
import ReactiveInsights from '@/components/ReactiveInsights.vue'
import SharedTaskViews from '@/components/SharedTaskViews.vue'
import TaskBoard from '@/components/TaskBoard.vue'
import { useTasks } from '@/composables/useTasks'
import { createTaskRepository } from '@/data/createTaskRepository'
import type { TaskRepository } from '@/data/TaskRepository'

const props = defineProps<{ repository?: TaskRepository }>()

const taskState = useTasks(props.repository ?? createTaskRepository())
const usesMockApi = import.meta.env.VITE_API_MODE !== 'real'
const transportLabel = usesMockApi ? 'MSW · Mock Service Worker' : 'Live REST backend'

onMounted(taskState.load)
</script>

<template>
  <div class="site-shell">
    <header class="site-header container">
      <a class="brand-link" href="#top" aria-label="Vue in Motion home"><BrandMark /></a>
      <nav aria-label="Primary navigation">
        <a href="#workspace">Workspace</a>
        <a href="#reactivity">Reactivity</a>
        <a href="#composition">Composition</a>
        <a href="#data-flow">Data flow</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero container" aria-labelledby="hero-title">
        <div class="hero__copy">
          <h1 id="hero-title" aria-label="Build one feature. Watch Vue connect the rest.">
            <span>Build one feature.</span>
            <span>Watch Vue connect</span>
            <span>the rest<span class="accent">.</span></span>
          </h1>
          <p>Add a task once. See state, views, and network behavior evolve together.</p>
          <div class="hero__actions">
            <a class="button button--primary button--large" href="#new-task">
              Add your first task
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>
            </a>
            <a class="text-link" href="#reactivity">
              Follow the data
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v13m-5-5 5 5 5-5" /></svg>
            </a>
          </div>
        </div>

        <div id="workspace" class="hero__demo">
          <TaskBoard
            :tasks="taskState.visibleTasks.value"
            :counts="taskState.counts.value"
            :filter="taskState.filter.value"
            :is-loading="taskState.isLoading.value"
            :error="taskState.error.value"
            @add="taskState.add"
            @toggle="taskState.toggle"
            @update:filter="taskState.filter.value = $event"
          />
        </div>
      </section>

      <ReactiveInsights
        :counts="taskState.counts.value"
        :progress="taskState.progress.value"
        :next-task="taskState.nextTask.value"
      />

      <SharedTaskViews
        :tasks="taskState.tasks.value"
        :counts="taskState.counts.value"
        :progress="taskState.progress.value"
        :activity="taskState.activity.value"
        @toggle="taskState.toggle"
      />

      <DataJourney
        :trace="taskState.lastRequest.value"
        :counts="taskState.counts.value"
        :progress="taskState.progress.value"
        :transport-label="transportLabel"
      />

      <ConfidenceSection :total="taskState.counts.value.all" :progress="taskState.progress.value" />
      <ImplementationGuide />
    </main>

    <footer class="site-footer container">
      <BrandMark compact />
      <p>Vue in Motion · Built with Vue 3, TypeScript, Vitest, MSW, and Bun</p>
    </footer>
  </div>
</template>

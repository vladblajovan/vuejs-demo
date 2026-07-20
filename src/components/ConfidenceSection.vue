<script setup lang="ts">
defineProps<{ total: number; progress: number }>()
</script>

<template>
  <section class="story-section confidence-section" aria-labelledby="confidence-title">
    <div class="container confidence-layout">
      <div>
        <h2 id="confidence-title">Change with confidence.</h2>
        <p>One test protects the behavior end-to-end.</p>
        <ol class="confidence-steps" aria-label="Test feedback loop">
          <li><span>＋</span>Add task</li>
          <li><span>↻</span>State updates</li>
          <li><span>✓</span>UI reflects</li>
          <li><span>✓</span>Test passes</li>
        </ol>
      </div>

      <div class="test-panel">
        <header><span>TaskBoard.spec.ts</span><span aria-hidden="true">&lt;/&gt;</span></header>
        <pre><code>it('adds a task and updates all derived state', async () =&gt; {
  await user.type(screen.getByPlaceholderText('Add a task'), 'Review pull request')
  await user.click(screen.getByRole('button', { name: 'Add task' }))

  expect(screen.getByText('{{ total }} tasks')).toBeInTheDocument()
  expect(screen.getByText('{{ progress }}%')).toBeInTheDocument()
  expect(screen.getByText('Review pull request')).toBeInTheDocument()
})</code></pre>
      </div>
    </div>
    <a
      class="button button--primary button--large confidence-cta"
      href="#implementation"
      data-test="explore-implementation"
    >
      Explore the implementation
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>
    </a>
  </section>
</template>

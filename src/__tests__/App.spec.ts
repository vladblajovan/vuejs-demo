import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from '@/App.vue'
import { FakeTaskRepository } from '@/testing/FakeTaskRepository'

describe('Vue in Motion', () => {
  it('loads tasks through the repository contract and reacts to user actions', async () => {
    const repository = new FakeTaskRepository([
      { id: 'task-1', title: 'Learn Vue reactivity', completed: false },
      { id: 'task-2', title: 'Write the first test', completed: true },
    ])
    const wrapper = mount(App, { props: { repository } })

    await flushPromises()

    expect(wrapper.get('h1').attributes('aria-label')).toBe(
      'Build one feature. Watch Vue connect the rest.',
    )
    expect(wrapper.text()).toContain('Learn Vue reactivity')
    expect(wrapper.find('[data-test="increment"]').exists()).toBe(false)

    await wrapper.get('[data-test="new-task"]').setValue('Ship the demo')
    await wrapper.get('[data-test="add-task"]').trigger('submit')
    await flushPromises()

    expect(repository.createdTitles).toEqual(['Ship the demo'])
    expect(wrapper.text()).toContain('Ship the demo')
    expect(wrapper.get('[data-test="insight-total"]').text()).toContain('3')
    expect(wrapper.get('[data-test="insight-progress"]').text()).toContain('33%')
    expect(wrapper.get('[data-test="activity-latest"]').text()).toContain('Ship the demo')
    expect(wrapper.get('[data-test="request-method"]').text()).toContain('POST')

    await wrapper.get('[aria-label="Complete Ship the demo"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="insight-progress"]').text()).toContain('67%')
    expect(wrapper.get('[data-test="activity-latest"]').text()).toContain('Task completed')
    expect(wrapper.get('[data-test="request-method"]').text()).toContain('PATCH')
  })

  it('presents one REST transport without a runtime data-source picker', async () => {
    const wrapper = mount(App, {
      props: { repository: new FakeTaskRepository() },
    })
    await flushPromises()

    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('HttpTaskRepository')
    expect(wrapper.text()).toContain('Mock Service Worker')
  })

  it('continues forward into a practical Vue implementation guide', async () => {
    const wrapper = mount(App, {
      props: { repository: new FakeTaskRepository() },
    })
    await flushPromises()

    expect(wrapper.get('[data-test="explore-implementation"]').attributes('href')).toBe(
      '#implementation',
    )
    expect(wrapper.get('#implementation').text()).toContain('How to reason about a Vue feature')
    expect(wrapper.get('#implementation').text()).toContain('Vue concepts used here')
    expect(wrapper.get('#implementation').text()).toContain('Architecture boundaries')
    expect(wrapper.get('#implementation').text()).toContain('Why REST + MSW')
    expect(wrapper.get('#implementation').text()).toContain('Rules worth carrying forward')
  })
})

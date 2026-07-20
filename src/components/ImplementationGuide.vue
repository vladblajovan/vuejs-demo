<template>
  <section
    id="implementation"
    class="story-section implementation-guide"
    aria-labelledby="implementation-title"
  >
    <div class="container">
      <header class="implementation-intro">
        <div>
          <h2 id="implementation-title">How to reason about a Vue feature.</h2>
          <p>
            Vue keeps the DOM synchronized with reactive state. Components describe the interface,
            composables organize behavior, and adapters keep network details at the edge.
          </p>
        </div>
        <nav class="guide-index" aria-label="Implementation guide">
          <a href="#mental-model"><span>01</span>Mental model</a>
          <a href="#vue-toolkit"><span>02</span>Vue toolkit</a>
          <a href="#architecture"><span>03</span>Architecture</a>
          <a href="#best-practices"><span>04</span>Best practices</a>
        </nav>
      </header>

      <article id="mental-model" class="guide-chapter guide-chapter--model">
        <header class="chapter-heading">
          <span>01</span>
          <div>
            <h3>Start with one-way data flow.</h3>
            <p>Events move toward state. Derived state flows back into every view.</p>
          </div>
        </header>

        <div class="architecture-rail" aria-label="Vue feature data flow">
          <div class="architecture-node">
            <small>View</small>
            <strong>TaskBoard.vue</strong>
            <code>@add="taskState.add"</code>
          </div>
          <svg viewBox="0 0 36 20" aria-hidden="true"><path d="M2 10h30m-6-6 6 6-6 6" /></svg>
          <div class="architecture-node architecture-node--core">
            <small>Feature state</small>
            <strong>useTasks()</strong>
            <code>ref · computed · actions</code>
          </div>
          <svg viewBox="0 0 36 20" aria-hidden="true"><path d="M2 10h30m-6-6 6 6-6 6" /></svg>
          <div class="architecture-node">
            <small>Port</small>
            <strong>TaskRepository</strong>
            <code>list · create · toggle</code>
          </div>
          <svg viewBox="0 0 36 20" aria-hidden="true"><path d="M2 10h30m-6-6 6 6-6 6" /></svg>
          <div class="architecture-node">
            <small>Adapter</small>
            <strong>REST + MSW</strong>
            <code>fetch('/api/tasks')</code>
          </div>
        </div>

        <div class="flow-principle">
          <p><strong>Intent moves right</strong><span>User event → action → side effect</span></p>
          <p>
            <strong>State moves left</strong><span>Response → reactive state → rendered DOM</span>
          </p>
          <p><strong>The payoff</strong><span>Each layer has one reason to change</span></p>
        </div>
      </article>

      <article id="vue-toolkit" class="guide-chapter guide-chapter--toolkit">
        <header class="chapter-heading">
          <span>02</span>
          <div>
            <h3>Vue concepts used here.</h3>
            <p>Each primitive has a narrow job. Together they remove manual DOM coordination.</p>
          </div>
        </header>

        <dl class="concept-ledger">
          <div>
            <dt><code>&lt;script setup&gt;</code><span>Component authoring</span></dt>
            <dd>
              Exposes imports and bindings directly to the template with strong TypeScript
              inference.
            </dd>
          </div>
          <div>
            <dt><code>ref()</code><span>Mutable source state</span></dt>
            <dd>Holds tasks, loading, errors, filters, activity, and the latest request trace.</dd>
          </div>
          <div>
            <dt><code>computed()</code><span>Derived state</span></dt>
            <dd>
              Calculates counts, progress, filters, and “next up” without synchronizing duplicates.
            </dd>
          </div>
          <div>
            <dt><code>useTasks()</code><span>Composition API</span></dt>
            <dd>
              Groups feature state and actions by capability instead of scattering them across
              components.
            </dd>
          </div>
          <div>
            <dt><code>props + emits</code><span>Component contracts</span></dt>
            <dd>
              Data travels down; user intent travels up. Child components do not own infrastructure.
            </dd>
          </div>
          <div>
            <dt><code>onMounted()</code><span>Lifecycle boundary</span></dt>
            <dd>
              Starts the initial load after mounting while the composable owns the asynchronous
              work.
            </dd>
          </div>
        </dl>

        <div class="code-reasoning">
          <div class="code-panel code-panel--large">
            <header><span>useTasks.ts</span><span aria-hidden="true">&lt;/&gt;</span></header>
            <pre><code>const tasks = ref&lt;Task[]&gt;([])

const counts = computed(() =&gt; ({
  all: tasks.value.length,
  open: tasks.value.filter(task =&gt; !task.completed).length,
  done: tasks.value.filter(task =&gt; task.completed).length,
}))

async function add(title: string) {
  const created = await repository.create(title)
  tasks.value.unshift(created)
}</code></pre>
          </div>
          <aside>
            <h4>Read it as a sentence</h4>
            <ol>
              <li><strong>State:</strong> tasks are the source of truth.</li>
              <li><strong>Derivation:</strong> counts recalculate when tasks change.</li>
              <li><strong>Action:</strong> the repository performs the effect.</li>
              <li><strong>Render:</strong> every consuming component updates automatically.</li>
            </ol>
          </aside>
        </div>
      </article>

      <article id="architecture" class="guide-chapter guide-chapter--architecture">
        <header class="chapter-heading">
          <span>03</span>
          <div>
            <h3>Architecture boundaries.</h3>
            <p>Keep the feature core stable; make external details replaceable.</p>
          </div>
        </header>

        <div class="architecture-explainer">
          <div class="file-map" aria-label="Project structure">
            <h4>Feature map</h4>
            <ul>
              <li><code>domain/task.ts</code><span>Data shape</span></li>
              <li><code>components/</code><span>Rendered views</span></li>
              <li><code>composables/useTasks.ts</code><span>Feature state + use cases</span></li>
              <li><code>data/TaskRepository.ts</code><span>Dependency contract</span></li>
              <li><code>data/HttpTaskRepository.ts</code><span>REST adapter</span></li>
              <li><code>mocks/handlers.ts</code><span>Mock HTTP server</span></li>
              <li><code>testing/FakeTaskRepository.ts</code><span>Fast unit-test fake</span></li>
            </ul>
          </div>

          <div class="decision-stack">
            <section>
              <h4>Why a repository?</h4>
              <p>
                <code>useTasks()</code> depends on a small interface, not on <code>fetch</code>. The
                UI stays unchanged if REST is replaced with GraphQL, IndexedDB, or a real API.
              </p>
            </section>
            <section>
              <h4>Why REST + MSW?</h4>
              <p>
                The application makes real browser HTTP requests. MSW intercepts them at the network
                boundary and returns mock responses, so development exercises production-like code.
              </p>
            </section>
            <section>
              <h4>Why a fake in unit tests?</h4>
              <p>
                A fake implements the same repository contract in memory. Tests stay deterministic
                and focus on feature behavior without involving HTTP.
              </p>
            </section>
          </div>
        </div>

        <div class="decision-table-wrap">
          <table class="decision-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Choice here</th>
                <th>Reason</th>
                <th>Revisit when…</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Global store?</th>
                <td>Composable</td>
                <td>One feature owns the state.</td>
                <td>Unrelated routes need shared state.</td>
              </tr>
              <tr>
                <th>GraphQL?</th>
                <td>REST</td>
                <td>The resource and operations are small.</td>
                <td>Clients need varied, deeply related data.</td>
              </tr>
              <tr>
                <th>Persistence?</th>
                <td>Reset on reload</td>
                <td>This is an isolated teaching demo.</td>
                <td>Tasks become user-owned product data.</td>
              </tr>
              <tr>
                <th>Mock level?</th>
                <td>MSW at HTTP</td>
                <td>Exercises the real repository adapter.</td>
                <td>A live backend becomes available.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article id="best-practices" class="guide-chapter guide-chapter--practices">
        <header class="chapter-heading">
          <span>04</span>
          <div>
            <h3>Rules worth carrying forward.</h3>
            <p>Practical defaults for features that remain understandable as they grow.</p>
          </div>
        </header>

        <ol class="practice-list">
          <li>
            <span>01</span>
            <div>
              <strong>Keep one source of truth.</strong>
              <p>
                Derive counts and progress with <code>computed()</code>; never synchronize copies by
                hand.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Organize by feature behavior.</strong>
              <p>
                Put related state and actions in a composable, then keep components focused on
                presentation.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Inject effects at the edge.</strong>
              <p>
                Network, storage, and time should enter through contracts that tests can replace.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <strong>Prefer explicit component APIs.</strong>
              <p>Use typed props and emits so ownership and event direction remain obvious.</p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <strong>Test behavior at the smallest useful seam.</strong>
              <p>
                Test the composable with a fake, components through user actions, and HTTP wiring
                through MSW.
              </p>
            </div>
          </li>
          <li>
            <span>06</span>
            <div>
              <strong>Add tools when complexity earns them.</strong>
              <p>
                Pinia, Vue Router, GraphQL, and persistence solve real scaling problems—not starter
                requirements.
              </p>
            </div>
          </li>
        </ol>

        <footer class="guide-summary">
          <strong>The Vue mental model</strong>
          <p>
            Template = UI description · reactive state = truth · computed = derivation · composable
            = feature behavior · adapter = side effect
          </p>
          <a href="#top">Return to the live demo <span aria-hidden="true">↑</span></a>
        </footer>
      </article>
    </div>
  </section>
</template>

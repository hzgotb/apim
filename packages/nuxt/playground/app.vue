<template>
  <main class="playground">
    <header class="hero">
      <p class="eyebrow">
        apim playground
      </p>
      <h1>Local interface module smoke test</h1>
      <p class="intro">
        The playground loads one collection from a directory ref and another from
        an explicit <code>.ts</code> file ref. This page uses <code>apim()</code>
        so the current build can exercise route scanning, generated payload types,
        and both <code>apim.collections</code> resolution modes.
      </p>
    </header>

    <section class="controls">
      <label>
        <span>Profile name</span>
        <input
          v-model="profileName"
          type="text"
        >
      </label>

      <label>
        <span>Echo message</span>
        <input
          v-model="echoMessage"
          type="text"
        >
      </label>

      <label>
        <span>Repeat</span>
        <input
          v-model.number="echoRepeat"
          type="number"
          min="1"
          max="3"
        >
      </label>

      <label>
        <span>Explicit tag</span>
        <input
          v-model="explicitTag"
          type="text"
        >
      </label>

      <button
        type="button"
        @click="refreshAll"
      >
        Refresh requests
      </button>
    </section>

    <section class="grid">
      <article class="card">
        <p class="label">
          GET /demo/profile
        </p>
        <p class="status">
          Status: {{ profileStatus }}
        </p>
        <p
          v-if="profileError"
          class="error"
        >
          {{ profileError.message }}
        </p>
        <template v-else-if="profileData">
          <p class="result">
            {{ profileData.message }}
          </p>
          <p class="meta">
            {{ profileData.source }}
          </p>
        </template>
      </article>

      <article class="card">
        <p class="label">
          POST /demo/echo
        </p>
        <p class="status">
          Status: {{ echoStatus }}
        </p>
        <p
          v-if="echoError"
          class="error"
        >
          {{ echoError.message }}
        </p>
        <template v-else-if="echoData">
          <p class="result">
            {{ echoData.echoed.join(' · ') }}
          </p>
          <p class="meta">
            total: {{ echoData.total }}
          </p>
        </template>
      </article>

      <article class="card">
        <p class="label">
          GET /demo-explicit/status
        </p>
        <p class="status">
          Status: {{ explicitStatus }}
        </p>
        <p
          v-if="explicitError"
          class="error"
        >
          {{ explicitError.message }}
        </p>
        <template v-else-if="explicitData">
          <p class="result">
            {{ explicitData.message }}
          </p>
          <p class="meta">
            {{ explicitData.entry }}
          </p>
          <p class="meta">
            route: {{ explicitData.route }}
          </p>
        </template>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
const profileName = ref('apim')
const echoMessage = ref('apim macro works')
const echoRepeat = ref(2)
const explicitTag = ref('explicit-ts-file')

const {
  data: profileData,
  error: profileError,
  status: profileStatus,
  refresh: refreshProfile,
} = await apim('/demo/profile', {
  query: {
    name: profileName,
  },
  watch: false,
})

const {
  data: echoData,
  error: echoError,
  status: echoStatus,
  refresh: refreshEcho,
} = await apim('/demo/echo', {
  method: 'post',
  body: {
    message: echoMessage,
    repeat: echoRepeat,
  },
  watch: false,
})

const {
  data: explicitData,
  error: explicitError,
  status: explicitStatus,
  refresh: refreshExplicit,
} = await apim('/demo-explicit/status', {
  query: {
    tag: explicitTag,
  },
  watch: false,
})

async function refreshAll() {
  await Promise.all([
    refreshProfile(),
    refreshEcho(),
    refreshExplicit(),
  ])
}
</script>

<style scoped>
.playground {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 20px 72px;
  font-family: 'IBM Plex Sans', sans-serif;
  color: #111827;
}

.hero {
  margin-bottom: 32px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

h1 {
  margin: 0 0 12px;
  font-size: clamp(2rem, 5vw, 3.4rem);
  line-height: 1;
}

.intro {
  max-width: 72ch;
  margin: 0;
  line-height: 1.6;
  color: #374151;
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(14, 165, 233, 0.08)),
    #ffffff;
}

label {
  display: grid;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #9ca3af;
  border-radius: 12px;
  font: inherit;
  background: #ffffff;
}

button {
  align-self: end;
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #0f766e, #0284c7);
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.card {
  padding: 20px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.label,
.status,
.meta,
.error,
.result {
  margin: 0;
}

.label {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.status,
.meta {
  color: #64748b;
}

.status {
  margin-bottom: 12px;
}

.result {
  margin-bottom: 8px;
  font-size: 1.1rem;
  font-weight: 700;
}

.error {
  color: #b91c1c;
}
</style>

<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>

<template>
  <span class="brand" :class="{ 'brand--compact': compact }" aria-label="Vue in Motion">
    <svg class="brand__mark" viewBox="0 0 48 42" aria-hidden="true">
      <path d="M2 2h10l12 20L36 2h10L24 40z" fill="#42b883" />
      <path d="M12 2h8l4 7 4-7h8L24 22z" fill="#172033" />
    </svg>
    <span v-if="!compact">Vue in Motion</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--ink);
  font-weight: 780;
  font-size: 1.08rem;
  letter-spacing: -0.03em;
}

.brand__mark {
  width: 2rem;
  height: auto;
}

.brand--compact .brand__mark {
  width: 1.6rem;
}
</style>

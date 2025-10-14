<template>
  <div>
    <Head>
      <Meta charset="UTF-8" />
      <Meta name="viewport" content="width=device-width" />
      <Link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <Meta name="generator" content="Vue 3" />
      <Title>Astro Basics</Title>
    </Head>
    <Body>
      <slot />
    </Body>
  </div>
</template>

<script setup>
import { Head, Meta, Link, Title, Body } from '@vueuse/head'
</script>

<style scoped>
html,
body {
  margin: 0;
  width: 100%;
  height: 100%;
}
</style>
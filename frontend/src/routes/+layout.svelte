<script lang="ts">
  import type { Snippet } from "svelte";
  import "../app.css";

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>hostahtml — by Codurance</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link
    href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{@render children()}

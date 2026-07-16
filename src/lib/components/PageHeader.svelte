<script lang="ts">
interface Props {
	title: string;
	subtitle?: string;
}

let { title, subtitle }: Props = $props();
</script>

<header class="mb-6">
	<h1 class="text-2xl font-semibold">{title}</h1>
	{#if subtitle}
		<p class="mt-1 text-foreground-muted">{subtitle}</p>
	{/if}
</header>

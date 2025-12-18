<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

const ROOT_CLASS = "parchment-mode";
const OVERLAY_ID = "parchment-reveal";
const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/parchment.mp3`;

let active = $state(false);
let audio: HTMLAudioElement | null = null;

function ensureOverlay(): HTMLDivElement {
	let el = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
	if (el) return el;
	el = document.createElement("div");
	el.id = OVERLAY_ID;
	el.setAttribute("aria-hidden", "true");
	document.body.prepend(el);
	return el;
}

function calcDocHeight(): number {
	return Math.max(
		document.body.scrollHeight,
		document.documentElement.scrollHeight,
		document.body.offsetHeight,
		document.documentElement.offsetHeight,
	);
}

function syncOverlayHeight() {
	const overlay = ensureOverlay();
	const h = calcDocHeight();
	overlay.style.height = `${h}px`;
	document.documentElement.style.setProperty("--parchment-h", `${h}px`);
}

async function start() {
	active = true;
	document.documentElement.classList.add(ROOT_CLASS);
	syncOverlayHeight();

	if (!audio) {
		audio = new Audio(AUDIO_SRC);
		audio.loop = true;
		audio.preload = "auto";
	}
	try {
		await audio.play();
	} catch (e) {
		// Autoplay policy / missing file / user gesture issues
		console.warn(
			`无法播放音频：${AUDIO_SRC}。请确认文件存在（public/audio/parchment.mp3）且点击触发。`,
			e,
		);
	}
}

function stop() {
	active = false;
	document.documentElement.classList.remove(ROOT_CLASS);
	if (audio) {
		audio.pause();
		audio.currentTime = 0;
	}
}

function toggle() {
	if (active) stop();
	else start();
}

onMount(() => {
	ensureOverlay();
	const onResize = () => {
		if (!active) return;
		syncOverlayHeight();
	};
	window.addEventListener("resize", onResize);

	// Swup will replace main content; keep overlay height in sync.
	const w = window as unknown as { swup?: unknown };
	const swup = w.swup;
	if (swup && typeof swup === "object" && "hooks" in swup) {
		const hooks = (swup as { hooks?: unknown }).hooks;
		if (hooks && typeof hooks === "object" && "on" in hooks) {
			(hooks as { on: (event: string, cb: () => void) => void }).on(
				"content:replace",
				onResize,
			);
			(hooks as { on: (event: string, cb: () => void) => void }).on(
				"page:view",
				onResize,
			);
		}
	}

	return () => {
		window.removeEventListener("resize", onResize);
		if (swup && typeof swup === "object" && "hooks" in swup) {
			const hooks = (swup as { hooks?: unknown }).hooks;
			if (hooks && typeof hooks === "object" && "off" in hooks) {
				(hooks as { off: (event: string, cb: () => void) => void }).off(
					"content:replace",
					onResize,
				);
				(hooks as { off: (event: string, cb: () => void) => void }).off(
					"page:view",
					onResize,
				);
			}
		}
	};
});
</script>

<button
	aria-label="羊皮纸模式（播放音乐并展开）"
	class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
	onclick={toggle}
>
	<Icon
		icon={active ? "material-symbols:music-off-rounded" : "material-symbols:music-note-rounded"}
		class="text-[1.25rem]"
	/>
</button>



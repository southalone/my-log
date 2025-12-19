<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount, tick } from "svelte";

const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/parchment.mp3`;
const PARCHMENT_TEX = `${import.meta.env.BASE_URL}textures/parchment.png`;
const BG_VIDEO = `${import.meta.env.BASE_URL}video/parchment.mp4`;

let started = $state(false);
let expanded = $state(false);
let isNormalMode = $state(true); // Controls the visual style (normal vs parchment)
let exiting = $state(false); // Controls the exit animation of normal elements

let viewportH = $state(60); // collapsed height (smaller for scroll effect)
const collapsedH = 60;

let contentEl: HTMLDivElement | null = null;
let sceneEl: HTMLDivElement | null = null;
let audio: HTMLAudioElement | null = null;

let paperLeft = $state(0);
let paperTop = $state(0);

// Portal action to move element to body when active
function portal(node: HTMLElement, active: boolean) {
	let target = document.body;
	let originalParent = node.parentNode;
	let placeholder = document.createComment("portal-placeholder");
	let isMoved = false;

	function update(active: boolean) {
		if (active) {
			if (!isMoved && originalParent) {
				originalParent.insertBefore(placeholder, node);
				target.appendChild(node);
				isMoved = true;
			}
		} else {
			if (isMoved && placeholder.parentNode) {
				placeholder.parentNode.insertBefore(node, placeholder);
				placeholder.parentNode.removeChild(placeholder);
				isMoved = false;
			}
		}
	}

	update(active);

	return {
		update,
		destroy() {
			if (isMoved && node.parentNode === target) {
				target.removeChild(node);
			}
		},
	};
}

function getContentHeight(): number {
	if (!contentEl) return collapsedH;
	return Math.max(collapsedH, contentEl.scrollHeight);
}

function syncHeight() {
	// In normal mode (not started), we let the height be auto (or controlled by CSS)
	// In parchment mode (started), we control it.
	if (!started) {
		viewportH = 0; // Not used in normal mode logic effectively, but let's see
		return;
	}
	viewportH = expanded ? getContentHeight() : collapsedH;
}

async function start() {
	if (!sceneEl) return;

	// 1. Capture current position before anything moves
	const rect = sceneEl.getBoundingClientRect();
	paperLeft = rect.left;
	paperTop = rect.top;

	// 2. Trigger Exit Animation (Phase 1)
	exiting = true;
	document.body.classList.add("ui-exiting");

	// Hide sidebar with fade-out effect
	const sidebar = document.getElementById("sidebar");
	if (sidebar) {
		sidebar.style.transition = "opacity 0.8s ease";
		sidebar.style.opacity = "0";
		sidebar.style.pointerEvents = "none";
	}

	// Wait for exit animation to complete (e.g., 800ms)
	await new Promise((r) => setTimeout(r, 800));

	// 3. Activate portal and switch mode (Phase 2)
	started = true; // Portal moves element to body
	await tick();

	// Reset exit state so the new content can appear
	exiting = false;
	isNormalMode = false;

	// Add class for parchment mode (hides UI permanently/keeps them hidden)
	document.body.classList.remove("ui-exiting");
	document.body.classList.add("parchment-mode-active");

	// 4. Expand content (Phase 3)
	setTimeout(() => {
		expanded = true;
		syncHeight();
	}, 600); // Delay to let the scroll appear first

	if (!audio) {
		audio = new Audio(AUDIO_SRC);
		audio.preload = "auto";
		audio.loop = true;
	}
	try {
		await audio.play();
	} catch (e) {
		console.warn(
			`无法播放音频：${AUDIO_SRC}。请确认文件存在（public/audio/parchment.mp3）且由点击触发。`,
			e,
		);
	}
}

function reset() {
	// Reverse animation could be implemented here, but for now simple reset
	started = false;
	expanded = false;
	isNormalMode = true;
	exiting = false;
	document.body.classList.remove("parchment-mode-active");
	document.body.classList.remove("ui-exiting");

	// Show sidebar again with fade-in effect
	const sidebar = document.getElementById("sidebar");
	if (sidebar) {
		sidebar.style.transition = "opacity 0.8s ease";
		sidebar.style.opacity = "1";
		sidebar.style.pointerEvents = "";
	}

	syncHeight();
	if (audio) {
		audio.pause();
		audio.currentTime = 0;
	}
}

onMount(() => {
	syncHeight();

	const onResize = () => {
		// keep expanded height correct
		if (!expanded) return;
		syncHeight();

		// Update paper left position if in parchment mode
		// Note: This is a simplification. Ideally we'd want to know where the "original" slot is.
		// But since we are portaled, we can't easily know.
		// However, the user asked to "keep current horizontal coordinate", which implies the coordinate at the moment of clicking.
		// So we might not want to update it on resize, or maybe we do?
		// For now, let's keep the initial click position as the anchor.
	};
	window.addEventListener("resize", onResize);
	return () => window.removeEventListener("resize", onResize);
});

onDestroy(() => {
	if (typeof document !== "undefined") {
		document.body.classList.remove("parchment-mode-active");
		document.body.classList.remove("ui-exiting");
	}
});
</script>

<!-- Placeholder to prevent layout collapse when scene is portaled -->
{#if started}
	<div style="height: {collapsedH}px; width: 100%;"></div>
{/if}

<div class="scene" class:scene-normal={isNormalMode} class:exiting={exiting} use:portal={started} bind:this={sceneEl}>
	<div class="bg-normal" aria-hidden="true"></div>
	<video
		class="bg-video"
		class:opacity-0={isNormalMode}
		autoplay

		muted
		loop
		playsinline
		preload="auto"
		aria-hidden="true"
	>
		<source src={BG_VIDEO} type="video/mp4" />
	</video>
	<div class="bg-video-mask" class:opacity-0={isNormalMode} aria-hidden="true"></div>

	<div class="topbar">
		{#if isNormalMode}
			<button class="start-btn normal-btn" onclick={start} aria-label="开始：播放音乐并展开羊皮纸文档">
				<Icon icon="material-symbols:play-arrow-rounded" class="icon" />
				<span class="label">开始测评</span>
			</button>
		{:else}
			<button class="start-btn ghost" onclick={reset} aria-label="重置">
				<Icon icon="material-symbols:replay-rounded" class="icon" />
				<span class="label">重置</span>
			</button>
		{/if}
	</div>

	<div class="stage" style={!isNormalMode ? `padding-left: ${paperLeft}px; padding-top: ${paperTop}px; justify-content: flex-start;` : ""}>
		<article
			class="paper"
			class:paper-normal={isNormalMode}
			class:paper-started={!isNormalMode}
			style={!isNormalMode ? `--parchment-img:url("${PARCHMENT_TEX}")` : ""}
		>
			<!-- Rollers (only visible in parchment mode) -->
			<div class="roll roll-top" class:hidden={isNormalMode}></div>
			<div class="roll roll-bottom" class:hidden={isNormalMode}></div>
			<!-- Shadow that moves with the bottom roll to show curvature -->
			<div class="roll-shadow-moving" class:hidden={isNormalMode}></div>
			
			<!-- Edges (only visible in parchment mode) -->
			<div class="edge edge-top" class:hidden={isNormalMode}></div>
			<div class="edge edge-bottom" class:hidden={isNormalMode}></div>
			<div class="edge edge-left" class:hidden={isNormalMode}></div>
			<div class="edge edge-right" class:hidden={isNormalMode}></div>

			<header class="paper-head">
				{#if !isNormalMode}
					<div class="head-cross" aria-hidden="true">✠</div>
					<div class="head-title">Archivum Ecclesiae</div>
					<div class="head-rule" aria-hidden="true"></div>
					<div class="head-sub">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do</div>
				{:else}
					<div class="normal-head-title">游戏测评报告</div>
					<div class="normal-head-sub">点击上方“开始测评”按钮查看详细内容</div>
				{/if}
			</header>

			<div
				class="paper-viewport"
				style={!isNormalMode ? `height:${viewportH}px; --paper-h:${viewportH}px;` : ""}
				aria-label="文档内容"
			>
				<div class="paper-content" bind:this={contentEl}>

					<p class="lead">
						雨声打在窗沿，像有人在门外轻轻敲击。书记员把一张发黄的纸放到桌上，
						说“这份东西，只能在灯下读。”
					</p>

					<p>
						第一行字几乎被潮气抹平，只剩下几个可辨的笔画。墨迹深处有细小的裂纹，
						像时间留下的皱褶。边缘的纤维毛糙、起卷，仿佛曾被反复折叠又展开。
					</p>

					<p>
						“若你看到这里，说明你已经同意继续。”下一段的笔锋更重，像是仓促写就：
						旧港北侧的钟楼在第三次停摆后，再也没有响过。巡夜人说他听见过潮水里有歌。
					</p>

					<p>
						档案附注：当夜雨势异常，街面水纹呈逆流。目击者描述有人影沿着石阶向下，
						衣摆却始终干燥。其后，仓库门栓被从内侧拉开，留下半枚蜡封。
					</p>

					<p>
						有人尝试复原蜡封纹样，发现与旧王朝的“巡察印”相近，但外圈多了一道断裂，
						像被刻意抹去的誓言。书记员拒绝记录那道断裂的含义。
					</p>

					<p>
						最后几页是空白。纸面却并非洁净：有细砂与灰屑嵌在纹理里。若把纸斜对着光，
						能看到压痕组成的地图——一条通往海堤尽头的线，停在“禁止入内”的标牌之前。
					</p>

					<p class="sig">
						——摘录自《旧港巡查簿》残卷（抄本）
					</p>
				</div>
			</div>
		</article>
	</div>
</div>

<style>
	.scene{
		position: fixed;
		inset: 0;
		z-index: 9999;
		min-height: 100vh;
		overflow-y: auto; /* Allow scrolling in parchment mode */
		overflow-x: hidden;
		/* Default dark background for parchment mode */
		background:
			radial-gradient(900px 600px at 50% 15%, rgba(60, 90, 120, 0.55), rgba(0,0,0,0) 60%),
			radial-gradient(1200px 900px at 50% 100%, rgba(10, 10, 12, 0.92), rgba(0, 0, 0, 0.98));
		color: rgba(255,255,255,0.9);
		transition: background 1s ease, top 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.scene-normal {
		/* Normal mode: In flow, relative */
		position: relative;
		inset: auto;
		z-index: 1;
		min-height: auto;
		overflow: visible;
		background: transparent; /* Let MainGridLayout handle bg */
		color: var(--text-main, #333);
		transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.8s ease;
	}
	.scene-normal.exiting {
		transform: scale(0.95) translateY(30px);
		opacity: 0;
		pointer-events: none;
	}
	
	/* Animation for entering parchment mode */
	.scene:not(.scene-normal) {
		animation: sceneFadeIn 1s ease forwards;
	}
	@keyframes sceneFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.bg-normal {
		position: absolute;
		inset: 0;
		background: var(--page-bg, #f9f9f9);
		z-index: -1;
		transition: opacity 1s ease;
	}

	.bg-video{
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
		filter: saturate(0.85) contrast(1.05) brightness(0.8);
		transition: opacity 1.5s ease;
	}
	.bg-video-mask{
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		background:
			radial-gradient(900px 600px at 50% 15%, rgba(0,0,0,0.15), rgba(0,0,0,0) 60%),
			linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55));
		transition: opacity 1.5s ease;
	}

	.topbar{
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		justify-content: center;
		padding: 18px 12px;
		backdrop-filter: blur(6px);
		background: linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0));
		transition: background 0.5s ease;
	}
	.scene-normal .topbar {
		background: transparent;
		backdrop-filter: none;
	}

	.start-btn{
		display: inline-flex;
		align-items: center;
		gap: 10px;
		height: 44px;
		padding: 0 16px;
		border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.18);
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.92);
		cursor: pointer;
		transition: transform 150ms ease, background 150ms ease, border-color 150ms ease, color 150ms ease;
	}
	.start-btn.normal-btn {
		/* Style for normal mode button */
		background: var(--btn-regular-bg, #e0e0e0);
		color: var(--btn-content, #333);
		border: 1px solid transparent;
	}
	.start-btn.normal-btn:hover {
		background: var(--btn-regular-bg-hover, #d0d0d0);
	}

	.start-btn:hover{
		background: rgba(255,255,255,0.12);
		border-color: rgba(255,255,255,0.28);
	}
	.start-btn:active{ transform: scale(0.98); }
	.start-btn.ghost{
		background: rgba(0,0,0,0.22);
	}
	.start-btn .icon{ font-size: 20px; }
	.start-btn .label{ font-weight: 700; letter-spacing: 0.04em; }

	.stage{
		position: relative;
		z-index: 6;
		display: flex;
		justify-content: center;
		padding: 18px 14px 90px;
		transition: justify-content 0s; /* Immediate switch */
	}
	.scene-normal .stage {
		justify-content: normal; /* Left align in normal mode */
		padding: 0; /* Remove extra padding in normal mode */
	}

	.paper{
		position: relative;
		width: min(860px, 92vw);
		border-radius: 0;
		/* Use ONLY the provided parchment image (no extra overlays, no clipping). */
		--parchment-img: none;
		background: var(--parchment-img);
		background-size: 100% 100%;
		background-position: center;
		background-repeat: no-repeat;
		box-shadow:
			0 22px 60px rgba(0,0,0,0.55),
			inset 0 0 0 1px rgba(120, 70, 25, 0.26),
			inset 0 0 100px rgba(0, 0, 0, 0.10);
		color: rgba(35, 20, 10, 0.92);
		filter: drop-shadow(0 22px 50px rgba(0,0,0,0.36));
		transition: all 1s ease;
		
		/* Ragged edges simulation using mask */
		/* Note: This is a simple approximation. For high fidelity, an SVG mask is better. */
		--mask-edge: 
			conic-gradient(from 0deg at 0 0, transparent 0deg, black 100deg),
			conic-gradient(from 180deg at 100% 0, transparent 0deg, black 100deg);
	}
	
	/* Add ragged edges to the paper in parchment mode */
	.paper.paper-started {
		/* Create a jagged edge effect using repeating gradients on the sides */
		background-image: 
			var(--parchment-img),
			linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.1) 2%, transparent 4%),
			linear-gradient(-90deg, transparent 0%, rgba(0,0,0,0.1) 2%, transparent 4%);
			
		/* Use clip-path to cut out jagged edges */
		clip-path: polygon(
			0% 0%, 
			100% 0%, 
			100% 100%, 
			0% 100%,
			
			/* Left edge details (simplified jagged line) */
			2px 95%, 0px 90%, 3px 85%, 1px 80%, 4px 75%, 1px 70%, 3px 65%, 0px 60%, 
			2px 55%, 0px 50%, 3px 45%, 1px 40%, 4px 35%, 1px 30%, 3px 25%, 0px 20%, 
			2px 15%, 0px 10%, 3px 5%, 0px 0%
		);
		/* Note: clip-path might cut off shadows. If so, we might need to apply it to an inner container or accept the trade-off. 
		   Given the shadow is on .paper, clip-path will cut it. 
		   Let's try a different approach for edges if shadow is important: border-image or mask.
		   But mask also hides shadow.
		   Let's stick to the visual texture for now and maybe a subtle clip-path that doesn't cut too deep.
		*/
		clip-path: none; /* Reset for now, let's rely on the texture and maybe pseudo elements for "torn" bits if needed. */
	}
	
	/* Let's use pseudo-elements to add "torn" bits on the sides */
	.paper.paper-started::before, .paper.paper-started::after {
		content: "";
		position: absolute;
		top: 0;
		bottom: 0;
		width: 12px;
		background: url("data:image/svg+xml,%3Csvg width='12' height='200' viewBox='0 0 12 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12,0 L12,200 L0,200 L4,190 L1,180 L5,170 L2,160 L6,150 L3,140 L7,130 L4,120 L8,110 L5,100 L9,90 L6,80 L10,70 L7,60 L11,50 L8,40 L12,30 L9,20 L12,10 L0,0 Z' fill='%233e2713' opacity='0.3'/%3E%3C/svg%3E");
		background-size: 100% 40px;
		pointer-events: none;
		mix-blend-mode: multiply;
		opacity: 0.6;
	}
	.paper.paper-started::before { left: 0; transform: scaleX(-1); }
	.paper.paper-started::after { right: 0; }

	/* Normal Mode Styles */
	.paper.paper-normal {
		width: 100%; /* Fill the grid column */
		max-width: none;
		background: var(--card-bg, #ffffff);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		border-radius: var(--radius-large, 1rem);
		color: var(--text-main, #333);
		filter: none;
		padding-bottom: 2rem;
	}

	.paper-head{
		padding: 34px 26px 8px;
		text-align: center;
		color: rgba(85, 55, 20, 0.75);
		transition: color 0.5s ease;
	}
	.paper.paper-normal .paper-head {
		color: var(--text-main, #333);
		padding: 24px 26px 16px;
		border-bottom: 1px solid var(--line-color, #eee);
		margin-bottom: 20px;
		text-shadow: none;
	}

	.normal-head-title {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}
	.normal-head-sub {
		font-size: 1rem;
		opacity: 0.7;
		color: inherit;
	}

	.head-cross{
		font-size: 22px;
		color: rgba(150, 105, 40, 0.70);
		letter-spacing: 0.12em;
		margin-bottom: 10px;
		text-shadow: 0 1px 0 rgba(255,255,255,0.35);
	}
	.head-title{
		font-family: "Snell Roundhand", "Zapfino", "Apple Chancery", "URW Chancery L", cursive;
		font-size: 44px;
		line-height: 1.1;
		font-weight: 500;
		color: rgba(130, 90, 35, 0.78);
		text-shadow: 0 1px 0 rgba(255,255,255,0.38);
	}
	.head-rule{
		height: 10px;
		margin: 12px auto 10px;
		width: min(520px, 78%);
		background:
			radial-gradient(8px 4px at 50% 50%, rgba(140, 95, 35, 0.55), rgba(0,0,0,0) 70%),
			linear-gradient(to right, rgba(140, 95, 35, 0), rgba(140, 95, 35, 0.55), rgba(140, 95, 35, 0));
		opacity: 0.75;
	}
	.head-sub{
		font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
		font-size: 13px;
		letter-spacing: 0.10em;
		opacity: 0.65;
	}

	.paper-viewport{
		position: relative;
		padding: 34px 26px 44px;
		overflow: hidden;
		transition: height 1200ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.paper.paper-normal .paper-viewport {
		padding: 0 26px;
		height: auto !important; /* Auto height in normal mode */
		overflow: visible;
	}

	.paper-content{
		font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
		font-size: 16px;
		line-height: 1.9;
		letter-spacing: 0.02em;
	}
	.paper.paper-normal .paper-content {
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 1rem;
		line-height: 1.75;
		letter-spacing: normal;
	}

	.paper-content .lead::first-letter{
		float: left;
		font-size: 48px;
		line-height: 1;
		padding-right: 10px;
		padding-top: 6px;
		font-weight: 800;
		color: rgba(60, 30, 10, 0.9);
	}
	.paper.paper-normal .paper-content .lead::first-letter {
		float: none;
		font-size: inherit;
		line-height: inherit;
		padding: 0;
		font-weight: inherit;
		color: inherit;
	}

	.paper-content p{ margin: 0 0 14px; }
	.paper-content .lead{
		font-weight: 650;
	}
	.paper.paper-normal .paper-content .lead {
		font-weight: normal;
	}

	.paper-content .sig{
		margin-top: 18px;
		opacity: 0.72;
		font-style: italic;
	}

	/* Edge animation / texture */
	.edge{
		position: absolute;
		pointer-events: none;
		mix-blend-mode: multiply;
		opacity: 0.55;
		filter: blur(0.2px);
		transition: opacity 0.5s;
	}
	.edge-top, .edge-bottom{
		left: 14px;
		right: 14px;
		height: 26px;
		background:
			repeating-radial-gradient(circle at 18px 18px, rgba(60,35,15,0.22) 0 2px, rgba(0,0,0,0) 2px 16px),
			linear-gradient(to bottom, rgba(60,35,15,0.20), rgba(0,0,0,0));
	}
	.edge-top{ top: -10px; transform: rotate(-0.6deg); }
	.edge-bottom{
		bottom: -12px;
		transform: rotate(0.8deg);
		background:
			repeating-radial-gradient(circle at 18px 8px, rgba(60,35,15,0.22) 0 2px, rgba(0,0,0,0) 2px 16px),
			linear-gradient(to top, rgba(60,35,15,0.20), rgba(0,0,0,0));
	}
	.edge-left, .edge-right{
		top: 18px;
		bottom: 18px;
		width: 28px;
		background:
			repeating-radial-gradient(circle at 14px 18px, rgba(60,35,15,0.20) 0 2px, rgba(0,0,0,0) 2px 18px),
			linear-gradient(to right, rgba(60,35,15,0.18), rgba(0,0,0,0));
	}
	.edge-left{ left: -12px; }
	.edge-right{
		right: -12px;
		transform: scaleX(-1);
	}

	.paper.paper-started .edge{
		animation: edgeWiggle 3.8s ease-in-out infinite;
	}
	@keyframes edgeWiggle{
		0%,100%{ opacity: 0.48; transform: translateY(0px); }
		50%{ opacity: 0.62; transform: translateY(2px); }
	}

	@media (prefers-reduced-motion: reduce){
		.rain, .mist, .paper.paper-started::after, .paper.paper-started .edge{ animation: none !important; }
		.paper-viewport{ transition: none !important; }
	}

	/* Scroll rollers (top fixed, bottom moves down as height expands) */
	.roll{
		position: absolute;
		left: -22px;
		right: -22px;
		height: 46px;
		border-radius: 2px 2px 4px 4px;
		pointer-events: none;
		z-index: 10;
		
		/* Golden Papyrus Scroll Texture */
		background-color: #dcb875;
		background-image:
			/* Fibrous texture noise */
			radial-gradient(circle at 50% 50%, rgba(0,0,0,0.08) 0%, transparent 20%),
			radial-gradient(circle at 10% 30%, rgba(0,0,0,0.08) 0%, transparent 20%),
			/* 3D Cylinder shading - Golden/Beige style */
			linear-gradient(to bottom, 
				#5e4020 0%, 
				#b89055 15%, 
				#e8dcca 40%, 
				#e8dcca 60%, 
				#b89055 85%, 
				#5e4020 100%
			);
		box-shadow: 
			0 10px 20px rgba(0,0,0,0.5),
			inset 0 1px 3px rgba(255,255,255,0.3),
			inset 0 -1px 3px rgba(0,0,0,0.3);
	}

	/* Paper roll ends (Spiral effect) */
	.roll::before, .roll::after {
		content: "";
		position: absolute;
		top: 2px;
		bottom: 2px;
		width: 14px;
		border-radius: 50%;
		background: 
			repeating-radial-gradient(
				circle at 50% 50%, 
				#5e4020 0, 
				#5e4020 1px, 
				#e8dcca 2px, 
				#e8dcca 3px
			);
		box-shadow: inset 0 0 3px rgba(0,0,0,0.5);
		border: 1px solid #3e2713;
	}
	/* Add a spiral line overlay */
	.roll .spiral-overlay {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: repeating-radial-gradient(
			circle at 50% 50%,
			transparent 0,
			transparent 2px,
			rgba(0,0,0,0.4) 3px,
			transparent 4px
		);
	}
	
	.roll::before { left: -5px; transform: scaleX(0.6); }
	.roll::after { right: -5px; transform: scaleX(0.6); }

	.roll-top{
		top: -20px;
	}

	.roll-bottom{
		bottom: -20px;
		top: auto; 
		/* Add rotation to transition */
		transition: 
			bottom 1200ms cubic-bezier(0.25, 1, 0.5, 1), 
			transform 1200ms cubic-bezier(0.25, 1, 0.5, 1);
	}
	
	/* Rolling animation for bottom rod */
	.paper.paper-started .roll-bottom {
		/* Rotate negative to simulate unrolling downwards */
		transform: rotate(-1080deg); 
	}
	/* Initial state for animation (rolled up?) 
	   Actually, since we just move the bottom rod down, rotation might not be strictly necessary for the rod itself 
	   unless it has a visible texture that needs to spin. 
	   Let's add a texture spin effect.
	*/

	.roll-shadow-moving {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 60px;
		pointer-events: none;
		background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%);
		z-index: 5;
		opacity: 0;
		transition: opacity 0.5s;
	}
	.paper.paper-started .roll-shadow-moving {
		opacity: 1;
	}

	.paper-viewport::before{

		/* rolled lip highlight under top roller */
		content: "";
		position: absolute;
		left: 22px;
		right: 22px;
		top: 28px;
		height: 26px;
		border-radius: 999px;
		background: linear-gradient(to bottom, rgba(60,35,15,0.24), rgba(0,0,0,0));
		opacity: 0.62;
		pointer-events: none;
		transition: opacity 0.5s;
	}
	.paper.paper-normal .paper-viewport::before {
		opacity: 0;
	}

				/* Global styles for fading out layout elements */
	/* Override all Tailwind transitions during exit */
	:global(body.ui-exiting *) {
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease !important;
	}
	
	/* Phase 1: UI Exiting */
	:global(body.ui-exiting #navbar-wrapper),
	:global(body.ui-exiting #top-row) {
		transform: translateY(-100%) !important;
		opacity: 0 !important;
	}
	:global(body.ui-exiting #sidebar) {
		transform: translateX(-100%) !important;
		opacity: 0 !important;
		pointer-events: none !important;
	}
	:global(body.ui-exiting .footer),
	:global(body.ui-exiting #toc-wrapper) {
		opacity: 0 !important;
		transition: opacity 0.8s ease !important;
	}

	/* Phase 2: Parchment Mode Active (Keep them hidden) */
	:global(body.parchment-mode-active #navbar-wrapper),
	:global(body.parchment-mode-active #sidebar),
	:global(body.parchment-mode-active #banner-wrapper),
	:global(body.parchment-mode-active .footer),
	:global(body.parchment-mode-active #toc-wrapper),
	:global(body.parchment-mode-active #top-row) {
		opacity: 0 !important;
		pointer-events: none !important;
		visibility: hidden;
		/* No transition needed here as they are already hidden by ui-exiting, 
		   but we keep it just in case of direct state switch */
	}
</style>
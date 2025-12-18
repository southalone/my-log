<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount, tick } from "svelte";

const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/parchment.mp3`;
const PARCHMENT_TEX = `${import.meta.env.BASE_URL}textures/parchment.png`;
const BG_VIDEO = `${import.meta.env.BASE_URL}video/parchment.mp4`;

let started = $state(false);
let expanded = $state(false);

let viewportH = $state(160); // collapsed height
const collapsedH = 160;

let contentEl: HTMLDivElement | null = null;
let audio: HTMLAudioElement | null = null;

function getContentHeight(): number {
	if (!contentEl) return collapsedH;
	return Math.max(collapsedH, contentEl.scrollHeight);
}

function syncHeight() {
	viewportH = expanded ? getContentHeight() : collapsedH;
}

async function start() {
	started = true;
	expanded = true;
	await tick();
	syncHeight();

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
	started = false;
	expanded = false;
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
	};
	window.addEventListener("resize", onResize);
	return () => window.removeEventListener("resize", onResize);
});
</script>

<div class="scene">
	<video
		class="bg-video"
		autoplay
		muted
		loop
		playsinline
		preload="auto"
		aria-hidden="true"
	>
		<source src={BG_VIDEO} type="video/mp4" />
	</video>
	<div class="bg-video-mask" aria-hidden="true"></div>

	<div class="topbar">
		{#if !started}
			<button class="start-btn" onclick={start} aria-label="开始：播放音乐并展开羊皮纸文档">
				<Icon icon="material-symbols:play-arrow-rounded" class="icon" />
				<span class="label">开始</span>
			</button>
		{:else}
			<button class="start-btn ghost" onclick={reset} aria-label="重置">
				<Icon icon="material-symbols:replay-rounded" class="icon" />
				<span class="label">重置</span>
			</button>
		{/if}
	</div>

	<div class="stage">
		<article
			class="paper"
			class:paper-started={started}
			style={`--parchment-img:url("${PARCHMENT_TEX}")`}
		>

			<header class="paper-head">
				<div class="head-cross" aria-hidden="true">✠</div>
				<div class="head-title">Archivum Ecclesiae</div>
				<div class="head-rule" aria-hidden="true"></div>
				<div class="head-sub">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do</div>
			</header>

			<div
				class="paper-viewport"
				style={`height:${viewportH}px; --paper-h:${viewportH}px;`}
				aria-label="文档内容（点击开始后向下展开）"
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
		position: relative;
		min-height: 100vh;
		overflow: hidden;
		background:
			radial-gradient(900px 600px at 50% 15%, rgba(60, 90, 120, 0.55), rgba(0,0,0,0) 60%),
			radial-gradient(1200px 900px at 50% 100%, rgba(10, 10, 12, 0.92), rgba(0, 0, 0, 0.98));
		color: rgba(255,255,255,0.9);
	}

	.bg-video{
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
		filter: saturate(0.85) contrast(1.05) brightness(0.8);
	}
	.bg-video-mask{
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		background:
			radial-gradient(900px 600px at 50% 15%, rgba(0,0,0,0.15), rgba(0,0,0,0) 60%),
			linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55));
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
		transition: transform 150ms ease, background 150ms ease, border-color 150ms ease;
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
	}

	.paper-head{
		padding: 34px 26px 8px;
		text-align: center;
		color: rgba(85, 55, 20, 0.75);
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

	.paper-content{
		font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
		font-size: 16px;
		line-height: 1.9;
		letter-spacing: 0.02em;
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
	.paper-content p{ margin: 0 0 14px; }
	.paper-content .lead{
		font-weight: 650;
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
		left: 20px;
		right: 20px;
		height: 30px;
		border-radius: 999px;
		pointer-events: none;
		opacity: 0.95;
		/* European scroll rod + subtle turned wood grain */
		background:
			radial-gradient(220px 24px at 50% 35%, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%),
			linear-gradient(to bottom, rgba(128, 78, 36, 0.98), rgba(78, 42, 16, 0.98)),
			repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0) 1px 10px);
		box-shadow:
			inset 0 0 0 1px rgba(0,0,0,0.28),
			inset 0 -10px 18px rgba(0,0,0,0.25),
			0 10px 18px rgba(0,0,0,0.18);
	}
	.roll::before{
		/* paper wrap sitting on the rod */
		content: "";
		position: absolute;
		inset: 6px 12px;
		border-radius: 999px;
		background:
			radial-gradient(160px 22px at 34px 50%, rgba(255,255,255,0.26), rgba(255,255,255,0) 60%),
			radial-gradient(220px 26px at 50% 55%, rgba(120,70,30,0.18), rgba(0,0,0,0) 70%),
			linear-gradient(to bottom, rgba(247, 232, 190, 0.98), rgba(236, 210, 154, 0.98));
		box-shadow: inset 0 0 0 1px rgba(60,35,15,0.18);
		opacity: 0.95;
	}
	.roll::after{
		/* rod caps (two ends) */
		content: "";
		position: absolute;
		left: -14px;
		right: -14px;
		top: 50%;
		height: 40px;
		transform: translateY(-50%);
		pointer-events: none;
		background:
			radial-gradient(circle at 14px 50%, rgba(25, 15, 8, 0.55) 0 3px, rgba(0,0,0,0) 4px),
			/* brass cap */
			radial-gradient(circle at 14px 50%, rgba(235, 196, 120, 0.98) 0 10px, rgba(140, 92, 36, 0.98) 11px 16px, rgba(0,0,0,0) 17px),
			radial-gradient(circle at calc(100% - 14px) 50%, rgba(25, 15, 8, 0.55) 0 3px, rgba(0,0,0,0) 4px),
			radial-gradient(circle at calc(100% - 14px) 50%, rgba(235, 196, 120, 0.98) 0 10px, rgba(140, 92, 36, 0.98) 11px 16px, rgba(0,0,0,0) 17px);
		opacity: 0.9;
		filter: drop-shadow(0 6px 10px rgba(0,0,0,0.22));
	}

	.roll-top{
		top: 10px;
		transform: rotate(-0.3deg);
	}

	.roll-bottom{
		/* sits at the bottom edge of the visible viewport; moves as --paper-h changes */
		top: calc(var(--paper-h) - 18px);
		transform: rotate(0.35deg);
		transition: top 1200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.roll-shadow{
		position: absolute;
		left: 10px;
		right: 10px;
		height: 52px;
		pointer-events: none;
	}
	.roll-shadow-bottom{
		top: calc(var(--paper-h) - 54px);
		background: radial-gradient(700px 40px at 50% 80%, rgba(60,35,15,0.24), rgba(0,0,0,0) 70%);
		opacity: 0.55;
		transition: top 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease;
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
	}
</style>



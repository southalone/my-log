// 自动生成（构建时/运行时）：从项目根目录上一级目录的 best_chapters/*.txt 中抽取可用于盲测对比的段落
// - report 页面会注入 window.__AB_EXCERPTS__ 并随机抽取两段
// - 若 best_chapters 不存在/为空，则返回空数组（页面会显示占位）

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AbExcerpt = {
	k: string; // unique key
	m: string; // model name (for reveal)
	t: string; // excerpt text
};

type BestChapterFile = {
	model: string;
	chapter: number | null;
	file: string;
	content: string;
};

function getProjectRootDir() {
	// my-log/src/database/ab-excerpts.ts -> ../../ = 项目根目录
	return fileURLToPath(new URL("../../", import.meta.url));
}

function safeReadText(filePath: string) {
	const raw = fs.readFileSync(filePath, "utf8");
	return raw
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.trim();
}

function parseBestChapterFilename(baseName: string) {
	// 例：gpt-5_第100回
	const m = baseName.match(/^(.+?)_第(\d+)回$/);
	if (!m) return { model: baseName, chapter: null as number | null };
	return { model: m[1], chapter: Number(m[2]) };
}

function pickParagraphsFromText(text: string) {
	const normalized = text.replace(/\r\n/g, "\n").trim();
	const lines = normalized.split("\n");
	const body =
		lines.length > 0 && /^第\s*\d+\s*回/.test(lines[0].trim())
			? lines.slice(1).join("\n")
			: normalized;

	return body
		.split(/\n\s*\n+/)
		.map((x) => x.trim())
		.filter(Boolean)
		.filter((x) => x.length >= 60)
		.map((p) => (p.length > 420 ? p.slice(0, 420) + "…" : p));
}

function loadBestChapterFiles(): BestChapterFile[] {
	try {
		const projectRoot = getProjectRootDir();
		const dir = path.join(projectRoot, "data", "best_chapters");
		if (!fs.existsSync(dir)) return [];

		const entries = fs.readdirSync(dir, { withFileTypes: true });
		return entries
			.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".txt"))
			.map((e) => {
				const file = path.join(dir, e.name);
				const baseName = path.basename(e.name, path.extname(e.name));
				const meta = parseBestChapterFilename(baseName);
				return {
					model: meta.model,
					chapter: meta.chapter,
					file,
					content: safeReadText(file),
				};
			});
	} catch {
		return [];
	}
}

function buildAbExcerptsFromBestChapters(): AbExcerpt[] {
	const files = loadBestChapterFiles();
	const out: AbExcerpt[] = [];

	for (const f of files) {
		const paras = pickParagraphsFromText(f.content);
		const picked = paras.slice(0, 8); // 每个文件取前 8 段（确定性 + 足够随机池）
		for (let i = 0; i < picked.length; i++) {
			const ch = f.chapter ?? 0;
			out.push({ k: `${f.model}-${ch}-${i + 1}`, m: f.model, t: picked[i] });
		}
	}

	out.sort((a, b) => a.m.localeCompare(b.m) || a.k.localeCompare(b.k));
	return out;
}

export const abExcerpts: AbExcerpt[] = buildAbExcerptsFromBestChapters();

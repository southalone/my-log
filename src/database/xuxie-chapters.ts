// 构建时/运行时从项目同级目录中读取所有 “续写内容_模型名” 文件夹，汇总为“按每回存放”的章节库。
//
// 目录约定（项目根目录的上一级）：
// - 续写内容_gpt-5/
//   - 第100回_凤姐遗计护幼女_檀纸密书寄风尘.txt
//   - ...
//
// 说明：
// - 若在其它机器/路径下这些外部目录不存在，会返回空数组（页面会提示）

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type XuxieChapter = {
	model: string;
	chapter: number;
	title: string;
	file: string;
	text: string;
	excerpt: string;
};

let _cache: XuxieChapter[] | null = null;

function getProjectRootDir() {
	// my-log/src/database/xuxie-chapters.ts -> ../../ = 项目根目录
	return fileURLToPath(new URL("../../", import.meta.url));
}

function safeReadText(filePath: string) {
	const raw = fs.readFileSync(filePath, "utf8");
	return raw
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.trim();
}

function parseChapterFromFilename(fileName: string) {
	// 例：第100回_凤姐遗计护幼女_檀纸密书寄风尘.txt
	const base = path.basename(fileName, path.extname(fileName));
	const m = base.match(/^第(\d+)回(?:[_\s-]+(.+))?$/);
	if (!m) return null;
	const chapter = Number(m[1]);
	const titleFromName = (m[2] || "").replace(/_/g, "　").trim();
	return { chapter, titleFromName };
}

function titleFromContentFirstLine(text: string) {
	// 例：第100回：凤姐遗计护幼女　檀纸密书寄风尘
	const first = text.split("\n")[0]?.trim() || "";
	if (/^第\s*\d+\s*回/.test(first)) return first;
	return "";
}

function makeExcerpt(text: string) {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const body =
		lines.length > 0 && /^第\s*\d+\s*回/.test(lines[0].trim())
			? lines.slice(1).join("\n")
			: text;
	const paras = body
		.split(/\n\s*\n+/)
		.map((x) => x.trim())
		.filter(Boolean);
	const p = paras.find((x) => x.length >= 40) || paras[0] || "";
	return p.length > 220 ? p.slice(0, 220) + "…" : p;
}

export function getXuxieChapters(): XuxieChapter[] {
	if (_cache) return _cache;
	const out: XuxieChapter[] = [];

	try {
		const projectRoot = getProjectRootDir();
		const base = path.resolve(projectRoot, "..");
		if (!fs.existsSync(base)) {
			_cache = [];
			return _cache;
		}

		const dirs = fs.readdirSync(base, { withFileTypes: true });
		const xuxieDirs = dirs
			.filter((d) => d.isDirectory() && d.name.startsWith("续写内容_"))
			.map((d) => d.name)
			.sort((a, b) => a.localeCompare(b));

		for (const dirName of xuxieDirs) {
			const model = dirName.replace(/^续写内容_/, "").trim();
			const dir = path.join(base, dirName);
			let files: string[] = [];
			try {
				files = fs
					.readdirSync(dir)
					.filter((f) => f.toLowerCase().endsWith(".txt"));
			} catch {
				continue;
			}

			for (const f of files) {
				// 跳过聚合文件
				if (f.includes("全部续写内容")) continue;
				const parsed = parseChapterFromFilename(f);
				if (!parsed) continue;

				const file = path.join(dir, f);
				let text = "";
				try {
					text = safeReadText(file);
				} catch {
					continue;
				}

				const title =
					titleFromContentFirstLine(text) ||
					(parsed.titleFromName
						? `第${parsed.chapter}回　${parsed.titleFromName}`
						: `第${parsed.chapter}回`);
				out.push({
					model,
					chapter: parsed.chapter,
					title,
					file,
					text,
					excerpt: makeExcerpt(text),
				});
			}
		}

		out.sort((a, b) => a.model.localeCompare(b.model) || a.chapter - b.chapter);
		_cache = out;
		return _cache;
	} catch {
		_cache = [];
		return _cache;
	}
}

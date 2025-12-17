import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type EvalDimKey = "文风契合度" | "人物一致性" | "语言质量" | "文学性";

export type EvalDimAvgs = {
	model: string;
	chapters: number;
	avg: number;
	dims: Record<EvalDimKey, number>;
};

const DIM_KEYS: EvalDimKey[] = [
	"文风契合度",
	"人物一致性",
	"语言质量",
	"文学性",
];

function getProjectRootDir() {
	// my-log/src/database/eval-dim-avgs.ts -> ../../ = 项目根目录
	return fileURLToPath(new URL("../../", import.meta.url));
}

function safeNumber(x: unknown) {
	const n = typeof x === "number" ? x : Number(x);
	return Number.isFinite(n) ? n : 0;
}

export function getEvalDimAvgs(): EvalDimAvgs[] {
	try {
		const projectRoot = getProjectRootDir();
		// 评测 JSON 放在仓库内：my-log/data/eval
		const base = path.join(projectRoot, "data", "eval");

		const files = fs
			.readdirSync(base, { withFileTypes: true })
			.filter((e) => e.isFile())
			.map((e) => e.name)
			.filter((name) => name.startsWith("评测结果_") && name.endsWith(".json"))
			.filter((name) => !name.includes("_dagang_"))
			.filter((name) => name !== "评测结果_qwen3-max.json");

		const rows: EvalDimAvgs[] = [];

		for (const name of files) {
			const full = path.join(base, name);
			const raw = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");
			const j = JSON.parse(raw);

			const model = String(j?.model_name || "").trim();
			if (!model) continue;

			const total = j?.statistics?.["总体统计"] || {};
			const dims = j?.statistics?.["维度分析"] || {};

			const row: EvalDimAvgs = {
				model,
				chapters: safeNumber(total?.["评测章节数"] ?? j?.total_chapters),
				avg: safeNumber(total?.["加权平均分"]),
				dims: {
					文风契合度: 0,
					人物一致性: 0,
					语言质量: 0,
					文学性: 0,
				},
			};

			for (const k of DIM_KEYS) {
				row.dims[k] = safeNumber(dims?.[k]?.["平均分"]);
			}

			rows.push(row);
		}

		// 保持一个稳定的排序：按平均分降序，其次按模型名
		rows.sort((a, b) => b.avg - a.avg || a.model.localeCompare(b.model));
		return rows;
	} catch {
		return [];
	}
}

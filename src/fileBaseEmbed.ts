import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { attachLockToggleUi, updateEmbedDomAfterToggle } from './lockToggleUi';
import { LockFlag, splitTokens, stripFlagToken } from './lockFlag';
import { getOwningMarkdownFile } from './markdownFile';

/**
 * 处理「嵌入 .base 文件」形式的 Bases：`![[a.base]]` / `![name](a.base)`。
 *
 * 锁定状态通过在链接标签末尾追加 `|x`（锁定）/ `|o`（解锁）来持久化，
 * 因此这些实现都基于「读取整份笔记源码 + 全局正则匹配」。
 */

const FILE_EMBED_SELECTOR = 'div.internal-embed[src$=".base"],span.internal-embed[src$=".base"],img[src$=".base"]';

export async function processFileBaseEmbeds(plugin: Plugin, element: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
	const embeds = element.querySelectorAll<HTMLElement>(FILE_EMBED_SELECTOR);
	if (embeds.length === 0) return;

	const hiddenTargets = await getHiddenTargetsForContext(plugin, ctx);

	embeds.forEach((embed) => {
		const src = embed.getAttribute('src') ?? embed.getAttribute('data-src') ?? '';
		if (!src) return;

		const normalized = normalizeTarget(src);
		const isHidden = hiddenTargets.has(normalized);

		attachLockToggleUi(embed, ctx, isHidden, (evt) => {
			evt.preventDefault();
			evt.stopPropagation();

			toggleBaseLock(plugin, ctx, normalized, embed).catch((error) => {
				console.error('[obsidian-bases-lock] Failed to toggle base lock', error);
			});
		});
	});
}

// 只缓存「最近一次」的结果：Reading view 在滚动时会对同一篇笔记连续多次
// 调用 postprocessor，内容没变时没必要重新跑两个全文正则。按内容做 key，
// 天然避免脏缓存问题（内容变了就直接 miss，不需要额外的失效逻辑）。
let lastHiddenTargetsCache: { path: string; content: string; result: Set<string> } | null = null;

async function getHiddenTargetsForContext(plugin: Plugin, ctx: MarkdownPostProcessorContext): Promise<Set<string>> {
	const file = getOwningMarkdownFile(plugin, ctx);
	if (!file) return new Set<string>();

	const raw = await plugin.app.vault.cachedRead(file);

	if (lastHiddenTargetsCache && lastHiddenTargetsCache.path === file.path && lastHiddenTargetsCache.content === raw) {
		return lastHiddenTargetsCache.result;
	}

	const result = extractHiddenBaseTargets(raw);
	lastHiddenTargetsCache = { path: file.path, content: raw, result };
	return result;
}

function extractHiddenBaseTargets(source: string): Set<string> {
	const result = new Set<string>();

	// 语法一：![user bases|x](src/a.base)
	const imageRe = /!\[([^\]]*?)\]\(([^)\s]+\.base)\)/g;
	let m: RegExpExecArray | null;
	while ((m = imageRe.exec(source)) !== null) {
		const label = m[1] ?? '';
		if (labelHasHideFlag(label)) {
			const target = normalizeTarget(m[2]);
			result.add(target);
		}
	}

	// 语法二：![[src/b.base|user bases|x]]
	const embedRe = /!\[\[([^\]|]+\.base)(\|([^\]]*))?\]\]/g;
	while ((m = embedRe.exec(source)) !== null) {
		const alias = m[3] ?? '';
		if (alias && labelHasHideFlag(alias)) {
			const target = normalizeTarget(m[1]);
			result.add(target);
		}
	}

	return result;
}

function labelHasHideFlag(label: string): boolean {
	return stripFlagToken(splitTokens(label, '|')).wasLocked;
}

function normalizeTarget(target: string): string {
	return target.trim();
}

async function toggleBaseLock(
	plugin: Plugin,
	ctx: MarkdownPostProcessorContext,
	targetSrc: string,
	embed?: HTMLElement,
): Promise<void> {
	const file = getOwningMarkdownFile(plugin, ctx);
	if (!file) return;

	const raw = await plugin.app.vault.read(file);

	const {
		content: newContent,
		newFlag,
		replaced,
	} = applyLockToggleToMarkdown(raw, targetSrc);

	if (!replaced || newContent === raw) return;

	await plugin.app.vault.modify(file, newContent);

	// 立即在当前 DOM 上生效：根据新 flag 切换 class 和按钮图标
	updateEmbedDomAfterToggle(embed, newFlag);
}

function applyLockToggleToMarkdown(source: string, targetSrc: string): {
	content: string;
	newFlag: LockFlag | null;
	replaced: boolean;
} {
	let replaced = false;
	let newFlag: LockFlag | null = null;

	let newContent = source;

	// 1. 优先处理 Markdown 图片语法：![name](src/base) / ![name|x](src/base) / ![name|o](src/base)
	const mdImagePattern = /!\[([^\]]*?)\]\(([^)\s]+\.base)\)/g;
	newContent = newContent.replace(mdImagePattern, (match: string, label: string, src: string) => {
		const normalized = normalizeTarget(src);
		if (replaced || normalized !== targetSrc) {
			return match;
		}

		const { baseName, nextFlag } = computeBaseNameAndNextFlag(
			label,
			normalized,
		);

		newFlag = nextFlag;
		replaced = true;
		return `![${baseName}|${nextFlag}](${normalized})`;
	});

	// 2. 如果没匹配到 Markdown 图片，再尝试 wiki 链接 ![[src/base]] 或 ![[src/base|name]] 形式
	if (!replaced) {
		const wikiPattern = /!\[\[([^|\]]+\.base)(\|([^\]]*))?\]\]/g;

		newContent = newContent.replace(
			wikiPattern,
			(match: string, src: string, _aliasPart: string | undefined, alias: string | undefined) => {
				const normalized = normalizeTarget(src);
				if (replaced || normalized !== targetSrc) {
					return match;
				}

				const { baseName, nextFlag } = computeBaseNameAndNextFlag(
					alias ?? '',
					normalized,
				);

				newFlag = nextFlag;
				replaced = true;
				// 保持 wiki 链接格式回写：路径可能含空格，转成 Markdown 图片语法会产生坏链
				return `![[${normalized}|${baseName}|${nextFlag}]]`;
			},
		);
	}

	return { content: newContent, newFlag, replaced };
}

function computeBaseNameAndNextFlag(rawLabel: string, normalizedPath: string): { baseName: string; nextFlag: LockFlag } {
	const { rest, wasLocked } = stripFlagToken(splitTokens(rawLabel, '|'));

	// 切换状态：x -> o（解锁），其他 -> x（上锁）
	const nextFlag: LockFlag = wasLocked ? 'o' : 'x';

	const baseName = rest.length > 0 ? rest.join('|') : deriveNameFromPath(normalizedPath);

	return { baseName, nextFlag };
}

function deriveNameFromPath(path: string): string {
	const withoutQuery = path.split('?')[0].split('#')[0];
	const segments = withoutQuery.split('/');
	const last = segments[segments.length - 1] ?? '';
	const dotIndex = last.lastIndexOf('.');
	if (dotIndex > 0) {
		return last.substring(0, dotIndex);
	}
	return last || path;
}

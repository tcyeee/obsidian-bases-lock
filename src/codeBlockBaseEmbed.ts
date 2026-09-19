import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { attachLockToggleUi, updateEmbedDomAfterToggle } from './lockToggleUi';
import { LockFlag, splitTokens, stripFlagToken } from './lockFlag';
import { getOwningMarkdownFile } from './markdownFile';

/**
 * 处理「页面内 base 代码块」形式的 Bases（Obsidian 较新版本支持）：
 *
 * ```base
 * views:
 *   - type: table
 * ```
 *
 * 这种写法没有 `.base` 文件路径可作为唯一标识，因此锁定状态直接记录在
 * 代码块起始围栏行上，追加一个 `x`（锁定）/ 去掉即为解锁的 flag，例如：
 *
 * ```` ```base x ```` （锁定） / ```` ```base ```` （解锁）
 *
 * 定位与改写该围栏行优先依赖 `ctx.getSectionInfo(el)`，它能返回当前元素
 * 对应源码片段的起止行号，从而精确修改「这一个」代码块，不影响同一
 * 笔记里的其他 base 代码块。
 *
 * 但 `getSectionInfo` 有官方文档明确警告的局限："may also return null in
 * many circumstances"——其中一种就是：笔记 B 被另一篇笔记 A 用 `![[B]]`
 * 嵌入时，B 内部渲染出来的这个代码块元素不再是 A 当前渲染文档的顶层直接
 * 子元素，`getSectionInfo` 会直接返回 null。此时退化为「按此元素是所在
 * 文件里第几个 base 代码块」定位（`findEmbedOrdinal` + `findNthBaseFenceLineIndex`），
 * 用 `ctx.sourcePath` 找到真正的源文件（无论嵌套几层都能正确解析到 B），
 * 再对它的源码做序数匹配，而不是依赖行号。
 */

const CODE_BLOCK_SELECTOR = 'div.block-language-base';

// 围栏起始行：可选的 blockquote/callout 前缀（`>`，可嵌套）+ 缩进
// + 三个及以上的 ` 或 ~ + "base" + 词边界 + 其余部分（flag 等）
const FENCE_LINE_RE = /^((?:\s*>)*\s*(?:`{3,}|~{3,}))base(?=\s|$)(.*)$/;

export async function processCodeBlockBaseEmbeds(plugin: Plugin, element: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
	const embeds = element.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR);
	if (embeds.length === 0) return;

	for (const embed of Array.from(embeds)) {
		const isHidden = await isCodeBlockLocked(plugin, ctx, embed);

		attachLockToggleUi(embed, ctx, isHidden, (evt) => {
			evt.preventDefault();
			evt.stopPropagation();

			toggleCodeBlockLock(plugin, ctx, embed).catch((error) => {
				console.error('[obsidian-bases-lock] Failed to toggle base lock (code block)', error);
			});
		});
	}
}

/**
 * `getSectionInfo` 返回 null 时的兜底定位：在「这个代码块所属文件」的范围内
 * （即最近的 `.markdown-embed-content` 祖先——B 被嵌入 A 时，B 的整篇渲染
 * 内容都在这个容器下），数出 `embed` 是第几个 base 代码块。
 *
 * 用 `closest('.markdown-embed-content') === scope` 过滤掉「B 又嵌入了 C，
 * C 里也有 base 代码块」这种更深层嵌套的干扰，确保序数只在 B 自己的
 * 代码块之间计算，不会数进 C 的。
 *
 * 找不到 `.markdown-embed-content` 祖先（说明根本不在 embed 里，
 * getSectionInfo 返回 null 另有原因）时返回 null，安全放弃兜底。
 */
function findEmbedOrdinal(embed: HTMLElement): number | null {
	const scope = embed.closest<HTMLElement>('.markdown-embed-content');
	if (!scope) return null;

	const siblings = Array.from(scope.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR)).filter(
		(el) => el.closest('.markdown-embed-content') === scope,
	);

	const index = siblings.indexOf(embed);
	return index === -1 ? null : index;
}

/**
 * 在 text 中找到第 ordinal 个（0-indexed）base 代码块的围栏起始行，返回其行号。
 * 只是逐行做 `parseFenceLine` 匹配的「平铺」扫描，不追踪围栏嵌套关系——
 * 如果某个无关代码块内部的示例文本里恰好有一行长得像 base 围栏，会被误数进去。
 * 这是可接受的简化：即便误判，最坏结果也只是切换到相邻的另一个块，
 * 且 `parseFenceLine` 校验仍会保证真正改写的那一行确实是合法围栏行。
 */
function findNthBaseFenceLineIndex(text: string, ordinal: number): number | null {
	let count = 0;
	let start = 0;
	let lineIndex = 0;

	while (true) {
		const nl = text.indexOf('\n', start);
		const end = nl === -1 ? text.length : nl;
		const line = text.slice(start, end);

		if (parseFenceLine(line)) {
			if (count === ordinal) return lineIndex;
			count++;
		}

		if (nl === -1) return null;
		start = nl + 1;
		lineIndex++;
	}
}

/** 在 text 中定位第 lineIndex 行（0-indexed），返回该行内容及其在 text 中的起止偏移，避免把整份文档 split 成数组 */
function getLineAt(text: string, lineIndex: number): { line: string; start: number; end: number } | null {
	let start = 0;
	for (let i = 0; i < lineIndex; i++) {
		const nl = text.indexOf('\n', start);
		if (nl === -1) return null;
		start = nl + 1;
	}
	const nl = text.indexOf('\n', start);
	const end = nl === -1 ? text.length : nl;
	return { line: text.slice(start, end), start, end };
}

function parseFenceLine(line: string): { prefix: string; tail: string; lineEnding: string } | null {
	// 兼容 CRLF：行尾的 \r 不参与围栏语法匹配（JS 正则 . 不匹配 \r），重建时原样保留
	const hasCR = line.endsWith('\r');
	const content = hasCR ? line.slice(0, -1) : line;

	const m = FENCE_LINE_RE.exec(content);
	if (!m) return null;
	return { prefix: m[1], tail: m[2] ?? '', lineEnding: hasCR ? '\r' : '' };
}

function isFenceLocked(tail: string): boolean {
	return stripFlagToken(splitTokens(tail, /\s+/)).wasLocked;
}

function toggleFenceTail(tail: string): { newTail: string; newFlag: LockFlag } {
	// 去掉已有的 x/o 标记（如果有），再决定新状态，避免残留旧标记
	const { rest, wasLocked } = stripFlagToken(splitTokens(tail, /\s+/));

	// 解锁后不再补 flag（保持 Obsidian 原生插入的 "```base" 裸围栏风格）；
	// 上锁则追加 x
	const tokens = wasLocked ? rest : [...rest, 'x'];
	const newFlag: LockFlag = wasLocked ? 'o' : 'x';

	const newTail = tokens.length > 0 ? ` ${tokens.join(' ')}` : '';
	return { newTail, newFlag };
}

async function isCodeBlockLocked(plugin: Plugin, ctx: MarkdownPostProcessorContext, embed: HTMLElement): Promise<boolean> {
	const info = ctx.getSectionInfo(embed);
	if (info) {
		const target = getLineAt(info.text, info.lineStart);
		if (!target) return false;

		const parsed = parseFenceLine(target.line);
		if (!parsed) return false;

		return isFenceLocked(parsed.tail);
	}

	// getSectionInfo 为 null：多半是这个代码块所在的笔记被另一篇笔记嵌入了，见文件头注释
	const ordinal = findEmbedOrdinal(embed);
	if (ordinal === null) return false;

	const file = getOwningMarkdownFile(plugin, ctx);
	if (!file) return false;

	// 只是读取当前状态用于渲染图标，用 cachedRead 即可，不必每次都打磁盘 I/O
	const raw = await plugin.app.vault.cachedRead(file);
	const lineIndex = findNthBaseFenceLineIndex(raw, ordinal);
	if (lineIndex === null) return false;

	const target = getLineAt(raw, lineIndex);
	if (!target) return false;

	const parsed = parseFenceLine(target.line);
	if (!parsed) return false;

	return isFenceLocked(parsed.tail);
}

async function toggleCodeBlockLock(plugin: Plugin, ctx: MarkdownPostProcessorContext, embed: HTMLElement): Promise<void> {
	const file = getOwningMarkdownFile(plugin, ctx);
	if (!file) return;

	// 用磁盘上的最新内容做实际改写，而不是渲染缓存的 info.text 整份覆盖文件——
	// 否则如果笔记里还有别的 embed 刚触发过写入，这里会用改写前的旧内容
	// 覆盖回去，把那次修改静默丢掉。
	const raw = await plugin.app.vault.read(file);

	// 按照 API 建议，在真正需要时才调用 getSectionInfo，取到当下最新的行号信息；
	// 为 null 时（嵌套 embed，见文件头注释）退化到按序数定位，两种情况下
	// lineIndex 都是相对 raw 的行号，后续逻辑不用再区分来源。
	const info = ctx.getSectionInfo(embed);
	let lineIndex: number | null;
	if (info) {
		lineIndex = info.lineStart;
	} else {
		const ordinal = findEmbedOrdinal(embed);
		if (ordinal === null) {
			console.warn('[obsidian-bases-lock] Could not locate this base code block (nested embed with no matching container), toggle skipped');
			return;
		}
		lineIndex = findNthBaseFenceLineIndex(raw, ordinal);
	}

	// 如果这期间上方内容发生了变化导致行号错位，下面的 parseFenceLine
	// 校验会因为该行不再是合法围栏行而安全放弃，不会误改到无关内容。
	const target = lineIndex === null ? null : getLineAt(raw, lineIndex);
	if (!target) {
		console.warn('[obsidian-bases-lock] Base code block line position is out of range, toggle skipped');
		return;
	}

	const parsed = parseFenceLine(target.line);
	if (!parsed) {
		console.warn('[obsidian-bases-lock] Could not parse the base code block fence line, toggle skipped:', target.line);
		return;
	}

	const { newTail, newFlag } = toggleFenceTail(parsed.tail);
	const newLine = `${parsed.prefix}base${newTail}${parsed.lineEnding}`;
	if (newLine === target.line) return;

	const newContent = raw.slice(0, target.start) + newLine + raw.slice(target.end);

	await plugin.app.vault.modify(file, newContent);

	updateEmbedDomAfterToggle(embed, newFlag);
}

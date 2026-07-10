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
 * 定位与改写该围栏行依赖 `ctx.getSectionInfo(el)`，它能返回当前元素
 * 对应源码片段的起止行号，从而精确修改「这一个」代码块，不影响同一
 * 笔记里的其他 base 代码块。
 */

const CODE_BLOCK_SELECTOR = 'div.block-language-base';

// 围栏起始行：可选的 blockquote/callout 前缀（`>`，可嵌套）+ 缩进
// + 三个及以上的 ` 或 ~ + "base" + 词边界 + 其余部分（flag 等）
const FENCE_LINE_RE = /^((?:\s*>)*\s*(?:`{3,}|~{3,}))base(?=\s|$)(.*)$/;

export function processCodeBlockBaseEmbeds(plugin: Plugin, element: HTMLElement, ctx: MarkdownPostProcessorContext): void {
	const embeds = element.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR);
	if (embeds.length === 0) return;

	embeds.forEach((embed) => {
		const isHidden = isCodeBlockLocked(ctx, embed);

		attachLockToggleUi(embed, ctx, isHidden, (evt) => {
			evt.preventDefault();
			evt.stopPropagation();

			toggleCodeBlockLock(plugin, ctx, embed).catch((error) => {
				console.error('[obsidian-bases-lock] Failed to toggle base lock (code block)', error);
			});
		});
	});
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

function isCodeBlockLocked(ctx: MarkdownPostProcessorContext, embed: HTMLElement): boolean {
	const info = ctx.getSectionInfo(embed);
	if (!info) return false;

	const target = getLineAt(info.text, info.lineStart);
	if (!target) return false;

	const parsed = parseFenceLine(target.line);
	if (!parsed) return false;

	return isFenceLocked(parsed.tail);
}

async function toggleCodeBlockLock(plugin: Plugin, ctx: MarkdownPostProcessorContext, embed: HTMLElement): Promise<void> {
	const file = getOwningMarkdownFile(plugin, ctx);
	if (!file) return;

	// 按照 API 建议，在真正需要时才调用 getSectionInfo，取到当下最新的行号信息
	const info = ctx.getSectionInfo(embed);
	if (!info) {
		console.warn('[obsidian-bases-lock] getSectionInfo returned null for this base code block, toggle skipped');
		return;
	}

	// 用磁盘上的最新内容做实际改写，而不是渲染缓存的 info.text 整份覆盖文件——
	// 否则如果笔记里还有别的 embed 刚触发过写入，这里会用改写前的旧内容
	// 覆盖回去，把那次修改静默丢掉。lineStart 仍按 getSectionInfo 给出的行号
	// 定位；如果这期间上方内容发生了变化导致行号错位，下面的 parseFenceLine
	// 校验会因为该行不再是合法围栏行而安全放弃，不会误改到无关内容。
	const raw = await plugin.app.vault.read(file);
	const target = getLineAt(raw, info.lineStart);
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

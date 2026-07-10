import { MarkdownPostProcessorContext, Plugin, TFile } from 'obsidian';

/**
 * 解析 postprocessor 上下文对应的笔记文件，并确认它是一个 Markdown 文件。
 * `fileBaseEmbed.ts` 和 `codeBlockBaseEmbed.ts` 都需要「当前笔记的 TFile」
 * 这一步，抽成共享函数避免重复。
 */
export function getOwningMarkdownFile(plugin: Plugin, ctx: MarkdownPostProcessorContext): TFile | null {
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile) || file.extension !== 'md') return null;
	return file;
}

import { Plugin } from 'obsidian';
import { processFileBaseEmbeds } from './fileBaseEmbed';
import { processCodeBlockBaseEmbeds } from './codeBlockBaseEmbed';

/**
 * 注册 Markdown 渲染后处理器，识别页面中的两种 Bases 写法：
 * - 嵌入 `.base` 文件：`![[a.base]]` 等（见 `fileBaseEmbed.ts`）
 * - 页面内 base 代码块：` ```base ` （见 `codeBlockBaseEmbed.ts`）
 *
 * 两者共享 `lockToggleUi.ts` 里的按钮创建 / 插入 / DOM 更新逻辑。
 */
export function registerBasesToolbarPostProcessor(plugin: Plugin): void {
	plugin.registerMarkdownPostProcessor((element, ctx) => {
		void processFileBaseEmbeds(plugin, element, ctx);
		processCodeBlockBaseEmbeds(plugin, element, ctx);
	});
}

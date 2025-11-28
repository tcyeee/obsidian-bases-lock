import { Plugin } from 'obsidian';
import { clearBasesToolbarCache, registerBasesToolbarPostProcessor } from './src/basesToolbar';

/**
 * Bases Toolbar Lock
 *
 * 插件入口文件，只负责：
 * - 在 onload 时注册 Markdown 渲染逻辑
 * - 在 onunload 时清理缓存等状态
 *
 * 具体「根据 |x 控制是否隐藏 Bases 顶部工具栏」的实现
 * 都放在 `src/basesToolbar.ts` 中，方便维护和阅读。
 */
export default class BasesLockPlugin extends Plugin {
	async onload() {
		registerBasesToolbarPostProcessor(this);
	}

	onunload() {
		clearBasesToolbarCache();
	}
}

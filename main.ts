import { Plugin } from 'obsidian';

/**
 * Bases Lock
 * 
 * 这个插件本身不做逻辑操作，
 * 只是作为一个载体，让同目录下的 `styles.css` 被 Obsidian 加载。
 * 真正隐藏 Bases 顶部操作栏的逻辑在 `styles.css` 里通过 CSS 完成。
 */
export default class BasesLockPlugin extends Plugin {
	async onload() {
		console.log('Bases Lock plugin loaded');
	}

	onunload() {
		console.log('Bases Lock plugin unloaded');
	}
}

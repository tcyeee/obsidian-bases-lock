import { MarkdownPostProcessorContext, MarkdownRenderChild, setIcon } from 'obsidian';
import { LockFlag } from './lockFlag';

/**
 * 与 embed 类型无关的共享 UI 逻辑：
 * - 创建锁定切换按钮
 * - 把按钮插入 Bases 工具栏 / 悬浮 overlay
 * - 切换后同步 DOM（图标 + class）
 *
 * 供 `fileBaseEmbed.ts`（`.base` 文件嵌入）和 `codeBlockBaseEmbed.ts`
 * （页面内 base 代码块）共用。
 */

export function createToggleButton(isHidden: boolean): HTMLElement {
	const toggle = createDiv({ cls: 'bases-lock-toggle' });

	const iconEl = createSpan({ cls: 'bases-lock-toggle-icon' });
	setIcon(iconEl, isHidden ? 'lock' : 'lock-open');

	const labelEl = createSpan({ cls: 'bases-lock-toggle-label' });
	labelEl.textContent = isHidden ? 'Locked' : 'Lock';

	toggle.appendChild(iconEl);
	toggle.appendChild(labelEl);

	return toggle;
}

export function insertButtonIntoToolbar(embed: HTMLElement, button: HTMLElement, ctx: MarkdownPostProcessorContext): void {
	const wrapper = createDiv({ cls: 'bases-toolbar-item bases-lock-toggle-item' });
	wrapper.appendChild(button);

	const doInsert = (): boolean => {
		const toolbar = embed.querySelector<HTMLElement>('.bases-toolbar');
		if (!toolbar) return false;

		// 放在图标组的最后一个：new-item-menu 是 Obsidian 原生工具栏的末位 item。
		// 窄宽度下这个位置最容易被挤出可视区域，靠 styles.css 里跟随
		// --bases-toolbar-label-display 折叠成纯图标来控制占位宽度。
		const newItemMenu = toolbar.querySelector<HTMLElement>('.bases-toolbar-item.bases-toolbar-new-item-menu');
		if (newItemMenu) {
			newItemMenu.after(wrapper);
		} else {
			toolbar.appendChild(wrapper);
		}
		return true;
	};

	if (doInsert()) return;

	// Toolbar 尚未渲染，等待它出现
	const observer = new MutationObserver((_mutations, obs) => {
		if (doInsert()) {
			obs.disconnect();
		}
	});

	observer.observe(embed, { childList: true, subtree: true });

	// embed 从渲染树卸载时兜底断开，避免 toolbar 始终未出现导致 observer 泄漏
	const child = new MarkdownRenderChild(embed);
	child.register(() => observer.disconnect());
	ctx.addChild(child);
}

export function insertOverlayIntoEmbed(embed: HTMLElement, button: HTMLElement): void {
	const overlay = createDiv({ cls: 'bases-lock-toggle-item bases-lock-overlay' });
	overlay.appendChild(button);
	embed.appendChild(overlay);
}

export function attachLockToggleUi(
	embed: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	isHidden: boolean,
	onToggle: (evt: MouseEvent) => void,
): void {
	embed.classList.add('bases-lock-container');

	// 把源码里的状态同步到 class 和（如果已存在的话）按钮图标上。
	// 必须是 toggle 而不是 add：用户手改笔记里的 flag 会让 post-process 重跑，
	// 只加不删会把 embed 卡在上一次的锁定状态。
	updateEmbedDomAfterToggle(embed, isHidden ? 'x' : 'o');

	// 避免重复创建按钮（在多次 post-process 时）
	if (embed.querySelector('.bases-lock-toggle') !== null) return;

	// 工具栏按钮：解锁态的入口，工具栏隐藏时一同隐藏
	const toolbarToggle = createToggleButton(isHidden);
	toolbarToggle.addEventListener('click', onToggle);
	insertButtonIntoToolbar(embed, toolbarToggle, ctx);

	// 悬浮解锁按钮：锁定 + hover 时显示，是工具栏隐藏后唯一的解锁入口。
	// 两种初始状态下都要建：切换锁定不会重新渲染 embed，updateEmbedDomAfterToggle
	// 只是翻 class，所以初始解锁的 embed 被锁上之后仍要用到这个节点。
	// 解锁态它由 CSS 保持 display:none —— 那时工具栏按钮已经可见，不必重复。
	const overlayToggle = createToggleButton(isHidden);
	overlayToggle.addEventListener('click', onToggle);
	insertOverlayIntoEmbed(embed, overlayToggle);
}

export function updateEmbedDomAfterToggle(
	embed: HTMLElement | undefined,
	newFlag: LockFlag | null,
): void {
	if (!embed || !newFlag) return;

	const shouldHide = newFlag === 'x';
	embed.classList.toggle('bases-toolbar-hidden', shouldHide);

	// 同时更新工具栏按钮和悬浮 overlay 按钮
	embed.querySelectorAll<HTMLElement>('.bases-lock-toggle').forEach((btn) => {
		const iconEl = btn.querySelector<HTMLElement>('.bases-lock-toggle-icon');
		const labelEl = btn.querySelector<HTMLElement>('.bases-lock-toggle-label');
		if (iconEl) setIcon(iconEl, shouldHide ? 'lock' : 'lock-open');
		if (labelEl) labelEl.textContent = shouldHide ? 'Locked' : 'Lock';
	});
}

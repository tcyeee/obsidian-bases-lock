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
	if (isHidden) embed.classList.add('bases-toolbar-hidden');
	embed.classList.add('bases-lock-container');

	// 避免重复创建按钮（在多次 post-process 时）
	if (embed.querySelector('.bases-lock-toggle') !== null) return;

	// 工具栏按钮（工具栏隐藏时一同隐藏）
	const toolbarToggle = createToggleButton(isHidden);
	toolbarToggle.addEventListener('click', onToggle);
	insertButtonIntoToolbar(embed, toolbarToggle, ctx);

	// 悬浮解锁按钮（锁定 + hover 时显示，用于在工具栏隐藏时解锁）
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

import {
	MarkdownPostProcessorContext,
	Plugin,
	TFile,
	MarkdownView,
} from 'obsidian';

export function registerBasesToolbarPostProcessor(plugin: Plugin): void {
	plugin.registerMarkdownPostProcessor((element, ctx) => {
		processMarkdownElement(plugin, element, ctx).catch((error) => {
			console.error(
				'[obsidian-bases-lock] Failed to process markdown element',
				error,
			);
		});
	});
}

export function clearBasesToolbarCache(): void {
	// 目前已移除运行时缓存，这里保留占位以兼容入口调用
}

async function processMarkdownElement(
	plugin: Plugin,
	element: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): Promise<void> {
	const hiddenTargets = await getHiddenTargetsForContext(plugin, ctx);

	const selector =
		'div.internal-embed[src$=".base"],span.internal-embed[src$=".base"],img[src$=".base"]';
	const embeds = element.querySelectorAll<HTMLElement>(selector);

	embeds.forEach((embed) => {
		const src =
			embed.getAttribute('src') ??
			embed.getAttribute('data-src') ??
			'';
		if (!src) return;

		const normalized = normalizeTarget(src);

		const isHidden = hiddenTargets.has(normalized);

		// 标记需要隐藏 toolbar 的 embed（根据当前解析结果）
		if (isHidden) {
			embed.classList.add('bases-toolbar-hidden');
		}

		// 为所有 .base embed 添加 hover 时出现的「🔒」按钮
		embed.classList.add('bases-lock-container');

		// 避免重复创建按钮（在多次 post-process 时）
		if (embed.querySelector('.bases-lock-toggle') !== null) return;

		const button = document.createElement('button');
		button.className = 'bases-lock-toggle';
		button.type = 'button';
		button.textContent = isHidden ? '🔒' : '🔓';

		button.addEventListener('click', (evt) => {
			evt.preventDefault();
			evt.stopPropagation();

			toggleBaseLock(plugin, ctx, normalized, embed).catch((error) => {
				console.error(
					'[obsidian-bases-lock] Failed to toggle base lock',
					error,
				);
			});
		});

		embed.appendChild(button);
	});
}

async function getHiddenTargetsForContext(
	plugin: Plugin,
	ctx: MarkdownPostProcessorContext,
): Promise<Set<string>> {
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile) || file.extension !== 'md') {
		return new Set<string>();
	}

	const raw = await plugin.app.vault.cachedRead(file);
	const hiddenTargets = extractHiddenBaseTargets(raw);

	return hiddenTargets;
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
	const parts = label
		.split('|')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	if (parts.length === 0) return false;
	const last = parts[parts.length - 1];
	return last.toLowerCase() === 'x';
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
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile) || file.extension !== 'md') return;

	const raw = await plugin.app.vault.read(file);

	// 优先处理 Markdown 图片语法：![name](src/base) / ![name|x](src/base) / ![name|o](src/base)
	const mdImagePattern = new RegExp(
		`!\\[([^\\]]*?)\\]\\(([^)\\s]+\\.base)\\)`,
		'g',
	);

	let replaced = false;
	let newFlag: 'x' | 'o' | null = null;

	let newContent = raw.replace(mdImagePattern, (match, label, src) => {
		const normalized = normalizeTarget(src);
		if (replaced || normalized !== targetSrc) {
			return match;
		}

		// 解析 label，检查/去掉末尾的 |x 或 |o
		const parts = (label as string)
			.split('|')
			.map((p: string) => p.trim())
			.filter((p: string) => p.length > 0);

		let isLocked = false;
		if (parts.length > 0) {
			const last = parts[parts.length - 1].toLowerCase();
			if (last === 'x' || last === 'o') {
				parts.pop();
				isLocked = last === 'x';
			}
		}

		// 切换状态：x -> o（解锁），其他 -> x（上锁）
		newFlag = isLocked ? 'o' : 'x';

		const baseName =
			parts.length > 0 ? parts.join('|') : deriveNameFromPath(normalized);

		const updated = `![${baseName}|${newFlag}](${normalized})`;
		replaced = true;
		return updated;
	});

	// 如果没匹配到 Markdown 图片，再尝试 wiki 链接 ![[src/base]] 或 ![[src/base|name]] 形式
	if (!replaced) {
		const wikiPattern = new RegExp(
			`!\\[\\[([^|\\]]+\\.base)(\\|([^\\]]*))?\\]\\]`,
			'g',
		);

		newContent = raw.replace(
			wikiPattern,
			(match, src, _aliasPart, alias) => {
				const normalized = normalizeTarget(src);
				if (replaced || normalized !== targetSrc) {
					return match;
				}

				const aliasText = (alias as string | undefined) ?? '';
				const parts = aliasText
					.split('|')
					.map((p) => p.trim())
					.filter((p) => p.length > 0);

				let isLocked = false;
				if (parts.length > 0) {
					const last = parts[parts.length - 1].toLowerCase();
					if (last === 'x' || last === 'o') {
						parts.pop();
						isLocked = last === 'x';
					}
				}

				// 切换状态：x -> o（解锁），其他 -> x（上锁）
				newFlag = isLocked ? 'o' : 'x';

				const baseName =
					parts.length > 0
						? parts.join('|')
						: deriveNameFromPath(normalized);

				const updated = `![${baseName}|${newFlag}](${normalized})`;
				replaced = true;
				return updated;
			},
		);
	}

	if (!replaced || newContent === raw) return;

	await plugin.app.vault.modify(file, newContent);

	// 1. 立即在当前 DOM 上生效：根据新 flag 切换 class 和按钮图标
	if (embed && newFlag) {
		const shouldHide = newFlag === 'x';
		embed.classList.toggle('bases-toolbar-hidden', shouldHide);

		const btn = embed.querySelector<HTMLButtonElement>(
			'.bases-lock-toggle',
		);
		if (btn) {
			btn.textContent = shouldHide ? '🔒' : '🔓';
		}
	}

	// 2. 尝试强制刷新当前阅读视图（防止某些情况下预览不自动重渲染）
	const mdView =
		plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (mdView && mdView.file === file) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const anyView = mdView as any;
		if (anyView.previewMode?.rerender) {
			try {
				anyView.previewMode.rerender(true);
			} catch (e) {
				console.warn(
					'[obsidian-bases-lock] Failed to force preview rerender',
					e,
				);
			}
		}
	}
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


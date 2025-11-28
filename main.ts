import { MarkdownPostProcessorContext, Plugin, TFile } from 'obsidian';

interface HiddenBasesCacheEntry {
	docId: string;
	sourcePath: string;
	hiddenTargets: Set<string>;
}

export default class BasesLockPlugin extends Plugin {
	private hiddenCache = new Map<string, HiddenBasesCacheEntry>();

	async onload() {
		console.log('Bases Lock plugin loaded');

		this.registerMarkdownPostProcessor((el, ctx) => {
			this.processMarkdownElement(el, ctx);
		});
	}

	onunload() {
		this.hiddenCache.clear();
		console.log('Bases Lock plugin unloaded');
	}

	private async processMarkdownElement(
		element: HTMLElement,
		ctx: MarkdownPostProcessorContext,
	): Promise<void> {
		const hiddenTargets = await this.getHiddenTargetsForContext(ctx);
		if (!hiddenTargets || hiddenTargets.size === 0) return;

		const selector =
			'div.internal-embed[src$=".base"],span.internal-embed[src$=".base"],img[src$=".base"]';
		const embeds = element.querySelectorAll<HTMLElement>(selector);

		embeds.forEach((embed) => {
			const src =
				embed.getAttribute('src') ??
				embed.getAttribute('data-src') ??
				'';
			if (!src) return;

			const normalized = this.normalizeTarget(src);
			if (hiddenTargets.has(normalized)) {
				embed.classList.add('bases-toolbar-hidden');
			}
		});
	}

	private async getHiddenTargetsForContext(
		ctx: MarkdownPostProcessorContext,
	): Promise<Set<string>> {
		const key = ctx.docId ?? ctx.sourcePath;
		const cached = this.hiddenCache.get(key);
		if (cached && cached.sourcePath === ctx.sourcePath) {
			return cached.hiddenTargets;
		}

		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(file instanceof TFile) || file.extension !== 'md') {
			const empty = new Set<string>();
			this.hiddenCache.set(key, {
				docId: ctx.docId ?? '',
				sourcePath: ctx.sourcePath,
				hiddenTargets: empty,
			});
			return empty;
		}

		const raw = await this.app.vault.cachedRead(file);
		const hiddenTargets = this.extractHiddenBaseTargets(raw);

		this.hiddenCache.set(key, {
			docId: ctx.docId ?? '',
			sourcePath: ctx.sourcePath,
			hiddenTargets,
		});

		return hiddenTargets;
	}

	private extractHiddenBaseTargets(source: string): Set<string> {
		const result = new Set<string>();

		// 语法一：![user bases|x](src/a.base)
		const imageRe = /!\[([^\]]*?)\]\(([^)\s]+\.base)\)/g;
		let m: RegExpExecArray | null;
		while ((m = imageRe.exec(source)) !== null) {
			const label = m[1] ?? '';
			if (this.labelHasHideFlag(label)) {
				const target = this.normalizeTarget(m[2]);
				result.add(target);
			}
		}

		// 语法二：![[src/b.base|user bases|x]]
		const embedRe = /!\[\[([^\]|]+\.base)(\|([^\]]*))?\]\]/g;
		while ((m = embedRe.exec(source)) !== null) {
			const alias = m[3] ?? '';
			if (alias && this.labelHasHideFlag(alias)) {
				const target = this.normalizeTarget(m[1]);
				result.add(target);
			}
		}

		return result;
	}

	private labelHasHideFlag(label: string): boolean {
		const parts = label
			.split('|')
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
		if (parts.length === 0) return false;
		const last = parts[parts.length - 1];
		return last.toLowerCase() === 'x';
	}

	private normalizeTarget(target: string): string {
		return target.trim();
	}
}

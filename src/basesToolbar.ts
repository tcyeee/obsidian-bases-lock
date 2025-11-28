import {
    MarkdownPostProcessorContext,
    Plugin,
    TFile,
} from 'obsidian';

interface HiddenBasesCacheEntry {
    docId: string;
    sourcePath: string;
    hiddenTargets: Set<string>;
}

const hiddenCache = new Map<string, HiddenBasesCacheEntry>();

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
    hiddenCache.clear();
}

async function processMarkdownElement(
    plugin: Plugin,
    element: HTMLElement,
    ctx: MarkdownPostProcessorContext,
): Promise<void> {
    const hiddenTargets = await getHiddenTargetsForContext(plugin, ctx);
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

        const normalized = normalizeTarget(src);
        if (hiddenTargets.has(normalized)) {
            embed.classList.add('bases-toolbar-hidden');
        }
    });
}

async function getHiddenTargetsForContext(
    plugin: Plugin,
    ctx: MarkdownPostProcessorContext,
): Promise<Set<string>> {
    const key = ctx.docId ?? ctx.sourcePath;
    const cached = hiddenCache.get(key);
    if (cached && cached.sourcePath === ctx.sourcePath) {
        return cached.hiddenTargets;
    }

    const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile) || file.extension !== 'md') {
        const empty = new Set<string>();
        hiddenCache.set(key, {
            docId: ctx.docId ?? '',
            sourcePath: ctx.sourcePath,
            hiddenTargets: empty,
        });
        return empty;
    }

    const raw = await plugin.app.vault.cachedRead(file);
    const hiddenTargets = extractHiddenBaseTargets(raw);

    hiddenCache.set(key, {
        docId: ctx.docId ?? '',
        sourcePath: ctx.sourcePath,
        hiddenTargets,
    });

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



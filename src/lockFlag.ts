/**
 * 两种 embed 写法（`.base` 文件的链接别名 / base 代码块的围栏尾部）
 * 都用「一串以分隔符隔开的 token，最后一个 token 是 x/o 标记」来表达锁定状态。
 * 这里把这套通用解析、判断、切换逻辑收口成共享函数，避免两边各写一份。
 */

export type LockFlag = 'x' | 'o';

/** 按分隔符切分并去除空白 token（空字符串会被过滤掉） */
export function splitTokens(input: string, delimiter: string | RegExp): string[] {
	return input
		.split(delimiter)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
}

/**
 * 去掉末尾已有的 x/o 标记（如果有），返回剩余 token 以及去掉前的锁定状态
 * （`wasLocked`）。既用于「判断当前是否锁定」（只看 `wasLocked`），也用于
 * 「切换」逻辑（结合 `rest` 决定新状态和新标记），避免两处各写一份判断。
 */
export function stripFlagToken(tokens: readonly string[]): { rest: string[]; wasLocked: boolean } {
	if (tokens.length === 0) return { rest: [], wasLocked: false };

	const last = tokens[tokens.length - 1].toLowerCase();
	if (last === 'x' || last === 'o') {
		return { rest: tokens.slice(0, -1), wasLocked: last === 'x' };
	}
	return { rest: [...tokens], wasLocked: false };
}

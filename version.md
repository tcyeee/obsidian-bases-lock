## Version 1.0.5

- Fixed a locked Base staying stuck in its previous state when the `x`/`o` flag was edited by hand in the note
- Fixed the invisible hover bridge above a locked Base covering the paragraph above it, swallowing its clicks and text selection
- The toolbar lock button now collapses to icon-only in narrow embeds, matching Obsidian's own toolbar buttons
- Clarified the usage instructions in the README

- 修复手动改写笔记里的 `x`/`o` 标记后，Base 仍停留在上一次锁定状态的问题
- 修复已锁定 Base 上方的透明悬停桥接区盖住上一段正文，吞掉其点击与文本选择的问题
- 操作栏里的锁定按钮在窄嵌入块中改为仅显示图标，与 Obsidian 原生按钮保持一致
- 完善 README 的使用说明

---

## Version 1.0.4

- Added support for locking inline `base` code blocks, not just embedded `.base` files
- Fixed base code block locking failing silently for CRLF line endings or blocks nested in callouts/blockquotes
- Fixed a rare case where toggling two base embeds in quick succession could silently discard one of the changes
- Fixed the release workflow publishing draft releases instead of live ones

- 新增支持锁定页面内的 base 代码块，不再局限于嵌入的 .base 文件
- 修复 CRLF 换行或嵌套在 callout/引用块中的 base 代码块无法锁定的问题
- 修复快速连续切换两个 base 时可能静默丢失其中一次修改的问题
- 修复 Release 工作流发布草稿而非正式版本的问题

---

## Version 1.0.3

- Restricted platform support to desktop only

- 限制插件仅在桌面端运行

---

## Version 1.0.2

**What's new:**
- Refactored DOM creation to use Obsidian's native `createDiv`/`createSpan` APIs.
- Added artifact attestation to release assets for cryptographic build provenance verification.

**Installation:**
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create the folder `<Vault>/.obsidian/plugins/obsidian-bases-lock/` and place the three files inside.
3. In Obsidian, go to **Settings → Community plugins → Installed plugins** and enable **Bases Lock**.
4. Make sure the official **Bases** core plugin is also enabled.

---

**更新内容：**
- 重构 DOM 创建，改用 Obsidian 原生 `createDiv`/`createSpan` API。
- 新增 Release 资源的加密制品证明，支持构建来源可验证。

**安装方式：**
1. 从最新 Release 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在 Vault 中创建文件夹 `<Vault>/.obsidian/plugins/obsidian-bases-lock/`，将三个文件放入其中。
3. 打开 Obsidian，进入 **设置 → 第三方插件 → 已安装插件**，启用 **Bases Lock**。
4. 确保官方核心插件 **Bases** 也已启用。

## Version 1.0.1

**What's new:**
- Disabled vertical (Y-axis) scrolling for Bases in Table and List view when in locked state.

**Installation:**
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create the folder `<Vault>/.obsidian/plugins/obsidian-bases-lock/` and place the three files inside.
3. In Obsidian, go to **Settings → Community plugins → Installed plugins** and enable **Bases Lock**.
4. Make sure the official **Bases** core plugin is also enabled.

---

**更新内容：**
- 锁定状态下，禁止 Table 和 List 视图的 Bases 在 Y 轴方向滚动。

**安装方式：**
1. 从最新 Release 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在 Vault 中创建文件夹 `<Vault>/.obsidian/plugins/obsidian-bases-lock/`，将三个文件放入其中。
3. 打开 Obsidian，进入 **设置 → 第三方插件 → 已安装插件**，启用 **Bases Lock**。
4. 确保官方核心插件 **Bases** 也已启用。

## Version 1.0.0

**Bases Lock** is a lightweight Obsidian plugin that adds a lock/unlock toggle button to embedded Bases views. When locked, it hides the Bases toolbar and disables header sorting interaction; when unlocked, it restores full interactivity. The plugin works exclusively in Reading view and stores lock state via the `|x` / `|o` embed syntax in the current document.

**Installation:**
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create the folder `<Vault>/.obsidian/plugins/obsidian-bases-lock/` and place the three files inside.
3. In Obsidian, go to **Settings → Community plugins → Installed plugins** and enable **Bases Lock**.
4. Make sure the official **Bases** core plugin is also enabled.

**Usage:**
1. Open a note containing an embedded `.base` file in Reading view.
2. Hover over the Base — a **Lock** button appears in the top-right corner.
3. Click to toggle between **locked** (`|x`) and **unlocked** (`|o`) states.

---

**Bases Lock** 是一个轻量级 Obsidian 插件，为嵌入的 Bases 视图添加锁定/解锁切换按钮。锁定时隐藏 Bases 工具栏并禁用表头排序交互；解锁时恢复完整的交互功能。插件仅在阅读视图下生效，通过在当前文档的嵌入语法中写入 `|x` / `|o` 来保存锁定状态。

**安装方式：**
1. 从最新 Release 下载 `main.js`、`manifest.json`、`styles.css`。
2. 在 Vault 中创建文件夹 `<Vault>/.obsidian/plugins/obsidian-bases-lock/`，将三个文件放入其中。
3. 打开 Obsidian，进入 **设置 → 第三方插件 → 已安装插件**，启用 **Bases Lock**。
4. 确保官方核心插件 **Bases** 也已启用。

**使用方式：**
1. 在阅读视图中打开包含嵌入 `.base` 文件的笔记。
2. 将鼠标悬停在 Base 上，右上角会出现 **Lock** 按钮。
3. 点击即可在**锁定**（`|x`）和**解锁**（`|o`）状态之间切换。

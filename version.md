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
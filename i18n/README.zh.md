![banner](../assets/banner.png)

<div align="center">中文 ｜ <a href="../README.md">English</a></div>

<br><br><br>

一个用于 **按需隐藏 Obsidian Bases 顶部操作栏（toolbar）并锁定表头交互** 的小插件。  通过简单点击「锁定 / 解锁」按钮，快速进行状态切换。

注意：插件只在阅读模式下生效。

![1](./assets/1.png)

## ⬇️ 安装

### 通过社区插件（推荐）

你可以直接在 Obsidian 的社区插件商店中安装本插件：

1. 打开 Obsidian，进入 设置 → 社区插件
2. 点击“浏览”，搜索 “Bases lock”
3. 点击“安装”，然后启用该插件

你也可以在社区插件页面中直接安装：[点击安装](https://obsidian.md/plugins?id=bases-lock)。



### 手动安装（本地开发版）

1. 在你的 Vault 中创建插件目录：

```text
<Vault>/.obsidian/plugins/obsidian-bases-lock/
```

2. 将以下文件复制到该目录：
   - `main.js`
   - `manifest.json`
   - `styles.css`

3. 打开 Obsidian：
   - 进入 **设置 → 社区插件 → 已安装插件**
   - 启用 **Bases Lock** 插件

4. 确保已启用官方 **Bases** 功能（核心插件）。



## ⭐使用

1. 鼠标移动到bases上，会出现“locked”按钮。
2. 点击锁定/解锁。



## 开发与构建

- **依赖安装：**

```bash
npm install
```

- **开发模式（watch 构建）：**

```bash
npm run dev
```

- **生产构建：**

```bash
npm run build
```

构建完成后会在插件根目录生成最新的 `main.js`，供 Obsidian 加载。



### 注意事项

- 插件只在 **阅读模式** 下渲染按钮并控制 toolbar / 表头行为。
- 选择器（例如 `.bases-toolbar`、`.bases-header`、`.bases-thead` 等）依赖当前 Obsidian 版本的 Bases DOM 结构：
  - 如果将来 Obsidian 更新导致 class 变化，可以通过开发者工具查看实际 class 并在 `styles.css` 中自行调整选择器。
- 插件只根据当前文档中 `.base` 引用的语法（`|x` / `|o`）做出判断，不会扫描或修改其他文档。***



### 设计思路

假设 `src/a.base` 被引用为以下几种形式之一：

- `![[src/a.base]]`
- `![My Base](src/a.base)`
- `![My Base|o](src/a.base)`
- `![My Base|x](src/a.base)`

点击按钮后的效果：

- 从 **未上锁 → 上锁**
  - 上述任意形式会被统一改写为：

```markdown
![My Base|x](src/a.base)
```

  - 若原本没有名称（如 `![[src/a.base]]`），则使用文件名（去掉 `.base` 后缀）作为名称：

```markdown
![[src/a.base]]  →  ![a|x](src/a.base)
```

- 从 **上锁 → 解锁**
  - 如果当前为 `![My Base|x](src/a.base)`，点击后会改为：

```markdown
![My Base|o](src/a.base)
```

同时：

- `x` → 隐藏 toolbar + 禁止 `.bases-thead` 点击，按钮显示 `locked`
- `o` → 恢复 toolbar 和表头交互，按钮显示 `unlocked`

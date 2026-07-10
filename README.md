![banner](./assets/banner.png)

<div align="center">
	<img src="https://img.shields.io/badge/📩-tcyeee@outlook.com-red">
	<!-- last commit -->
	<img src="https://img.shields.io/github/last-commit/tcyeee/obsidian-bases-lock">
	<!-- release -->
	<img src="https://img.shields.io/github/v/release/tcyeee/obsidian-bases-lock">
	<!-- license -->
	<img src="https://img.shields.io/github/license/tcyeee/obsidian-bases-lock">
	<!-- stars -->
	<img src="https://img.shields.io/github/stars/tcyeee/obsidian-bases-lock">
</div>

<div align="center">English ｜ <a href="./i18n/README.zh.md">中文</a></div>

<br><br>

**Bases Lock** is a small Obsidian plugin that lets you **hide the Bases toolbar and disable header interaction** on demand, keeping the view clean and preventing accidental changes.

**Note:** The plugin only works in **Reading view**, and is **desktop only**.

![demo](./assets/1.gif)

## ⭐ Usage

1. Open a note in **Reading view** that embeds a Base.
2. Hover your mouse over the Base — a **lock** button appears in the corner.
3. Click it to toggle between **locked** and **unlocked**.

That's it — while locked:

- The Bases toolbar is hidden
- Header (column) interaction is disabled
- Only the `.base` embed in the current document is affected — other notes are never scanned or modified

## ⬇️ Installation

1. Open Obsidian and go to **Settings → Community plugins**
2. Select **Browse** and search for **"Bases lock"**
3. Click **Install**, then enable the plugin
4. Make sure the official **Bases** core plugin is also enabled

Or install it directly here: [Install from Community Plugins](https://community.obsidian.md/plugins/bases-lock)

## ❓ How it works

When you click the lock button, the plugin rewrites how the Base is embedded in your Markdown, so the locked/unlocked state is saved with the note.

For example, `src/a.base` embedded as any of the following:

- `![[src/a.base]]`
- `![My Base](src/a.base)`
- `![My Base|o](src/a.base)`

...becomes this when **locked**:

```markdown
![My Base|x](src/a.base)
```

(If there was no display name, the file name is used automatically — e.g. `![[src/a.base]]` → `![a|x](src/a.base)`.)

Clicking again to **unlock** changes it to:

```markdown
![My Base|o](src/a.base)
```

In short:

- `|x` → toolbar hidden, header interaction disabled, button shows **locked**
- `|o` → toolbar and header interaction restored, button shows **unlocked**

### Inline `base` code blocks

Bases can also be written directly as a code block inside a note:

````markdown
```base
views:
  - type: table
```
````

This is supported too. Locking it appends an `x` flag right after the fence's language token:

````markdown
```base x
views:
  - type: table
```
````

Unlocking removes the flag again. Each code block is toggled independently, so a note can freely mix multiple `.base` embeds and inline `base` code blocks.


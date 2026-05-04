# glok-cli

[![npm version](https://img.shields.io/npm/v/glok-cli.svg)](https://www.npmjs.com/package/glok-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

> Official CLI tool for packaging, signing, and submitting apps to the **Glok Store**.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [glok init](#glok-init)
  - [glok build](#glok-build)
  - [glok package](#glok-package)
  - [glok sign](#glok-sign)
  - [glok verify](#glok-verify)
  - [glok submit](#glok-submit)
- [Package Formats](#package-formats)
- [manifest.json Reference](#manifestjson-reference)
- [Signing & Verification](#signing--verification)
- [Multi-Language Support](#multi-language-support)
- [Example Workflow](#example-workflow)
- [Contributing](#contributing)

---

## Installation

Requires **Node.js 18+**.

```bash
npm install -g glok-cli
```

Verify the installation:

```bash
glok --version
```

---

## Quick Start

```bash
# 1. Create and enter your project folder
mkdir my-app && cd my-app

# 2. Initialize the project
glok init

# 3. Build your app (compiles to ./dist)
glok build

# 4. Sign with your Ed25519 key
glok sign

# 5. Package into .glok or .glk
glok package

# 6. Verify the package
glok verify my-app-1.0.0.glok

# 7. Generate submission payload
glok submit
```

---

## Commands

### `glok init`

Interactively initialize a new Glok project in the current directory.

```bash
glok init
```

**Creates:**
- `manifest.json` — app metadata
- `dist/` — placeholder for compiled assets
- `icon.png` — placeholder icon (replace with your own)
- `.gitignore` — sensible defaults

---

### `glok build`

Build your project. Automatically detects and runs `npm run build`, or you can specify a custom script.

```bash
glok build
glok build --script "python build.py"
glok build --script "flutter build web"
```

**Options:**

| Flag | Description |
|------|-------------|
| `-s, --script <cmd>` | Custom build command to run |

Your compiled output **must** end up in the `dist/` directory.

---

### `glok package`

Bundle your app into a `.glok` (desktop) or `.glk` (mobile/web) archive.

```bash
glok package
glok package --output my-custom-name.glok
```

**Options:**

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Custom output file path |
| `--no-sign` | Skip including `signature.sig` even if present |

The platform is read from `manifest.json`. Desktop apps produce `.glok`, mobile/web apps produce `.glk`.

**Archive contents:**

```
my-app-1.0.0.glok
├── manifest.json
├── dist/
│   └── index.js
├── icon.png
└── signature.sig  (if signed before packaging)
```

---

### `glok sign`

Generate an Ed25519 key pair and sign your app package.

```bash
# Sign manifest.json before packaging (signature will be bundled in the package)
glok sign

# Sign a specific package file (creates <package>.sig alongside it)
glok sign --package my-app-1.0.0.glok

# Regenerate keys
glok sign --regenerate
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p, --package <file>` | Package file to sign |
| `--regenerate` | Regenerate key pair even if one already exists |

**Keys are stored in `~/.glok/keys/`:**

```
~/.glok/keys/
├── private.key   (chmod 600 — never share this)
└── public.key    (share with Glok Store for verification)
```

> ⚠️ **Never commit your `private.key` to version control.**

---

### `glok verify`

Verify a Glok package for structural integrity, manifest validity, and signature authenticity.

```bash
glok verify my-app-1.0.0.glok

# Use a specific public key
glok verify my-app-1.0.0.glok --public-key <base64-public-key>
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<package>` | Path to the `.glok` or `.glk` file |

**Options:**

| Flag | Description |
|------|-------------|
| `--public-key <base64>` | Override the key from `~/.glok/keys/public.key` |

**Checks performed:**
1. Package is a valid ZIP archive
2. `manifest.json` exists and all required fields are present
3. `dist/` directory contains files
4. `icon.png` is present
5. `signature.sig` (if present) is cryptographically valid

---

### `glok submit`

Generate a JSON submission payload ready for the Glok Store API.

```bash
glok submit
glok submit --package my-app-1.0.0.glok
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p, --package <file>` | Package file path (auto-detected if omitted) |

Outputs a JSON object with package metadata, SHA-256 checksum, signature, and public key — ready to POST to the Glok Store API.

---

## Package Formats

| Extension | Platform | Description |
|-----------|----------|-------------|
| `.glok` | Desktop | Native desktop applications |
| `.glk` | Mobile/Web | Mobile and progressive web applications |

Both formats are **ZIP archives** with the following structure:

```
<app-name>-<version>.<ext>
├── manifest.json       App metadata and configuration
├── dist/               Compiled application files
│   └── index.js        (or any entry point)
├── icon.png            App icon (512×512 recommended)
└── signature.sig       Ed25519 detached signature (Base64)
```

---

## manifest.json Reference

```json
{
  "name": "My App",
  "version": "1.0.0",
  "description": "A short description",
  "platform": "desktop",
  "entry": "dist/index.js",
  "permissions": [],
  "developer": "your-developer-id",
  "icon": "icon.png"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name of the app |
| `version` | ✅ | Semver version string (e.g., `1.0.0`) |
| `platform` | ✅ | `"desktop"` or `"mobile"` |
| `entry` | ✅ | Relative path to the entry file inside the archive |
| `permissions` | ✅ | Array of permission strings (can be empty) |
| `developer` | ✅ | Your developer ID or organization name |
| `description` | ⬜ | Short description shown in the store |
| `icon` | ⬜ | Icon file path inside the archive |

---

## Signing & Verification

glok-cli uses **Ed25519** asymmetric signatures (via [TweetNaCl.js](https://tweetnacl.js.org/)) for package integrity.

### How it works

1. **Key generation** — `glok sign` generates a key pair on first use and stores it at `~/.glok/keys/`.

2. **Signing** — The CLI signs your `manifest.json` content (before packaging) producing `signature.sig`. This file is bundled inside the package archive.

3. **Verification** — `glok verify` extracts `signature.sig` and re-verifies it against the manifest using your public key.

4. **Submission** — `glok submit` includes your public key in the payload so the Glok Store can independently verify the package.

### Sharing your public key

Your **public key** is safe to share:

```bash
cat ~/.glok/keys/public.key
```

Register it with the Glok Store developer portal to enable verified submissions.

---

## Multi-Language Support

glok-cli treats your `dist/` directory as a **compiled artifact drop zone**. Any language can be used as long as its output ends up in `dist/`:

| Language | Build command |
|----------|--------------|
| Node.js | `npm run build` (auto-detected) |
| Python | `glok build --script "python build.py"` |
| Flutter | `glok build --script "flutter build web --output dist"` |
| Java | `glok build --script "mvn package && cp target/*.jar dist/"` |
| Rust | `glok build --script "cargo build --release && cp target/release/app dist/"` |

---

## Example Workflow

```bash
# Step 1: Set up project
mkdir my-awesome-app && cd my-awesome-app
glok init
# → Fill in: name, version, platform, entry point, developer ID

# Step 2: Develop your app
# ... write code ...
npm run build
# Your compiled output must be in ./dist/

# Step 3: Sign (generates key pair on first run)
glok sign
# → Keys saved to ~/.glok/keys/
# → signature.sig written to project root

# Step 4: Package
glok package
# → my-awesome-app-1.0.0.glok created

# Step 5: Verify
glok verify my-awesome-app-1.0.0.glok
# → All checks pass ✔

# Step 6: Prepare submission
glok submit
# → JSON payload printed to stdout
# → Submit via Glok Store developer portal (or API)
```

---

## Project Structure

```
glok-cli/
├── bin/
│   └── glok.js              CLI entry point
├── src/
│   ├── commands/
│   │   ├── init.ts          glok init
│   │   ├── build.ts         glok build
│   │   ├── package.ts       glok package
│   │   ├── sign.ts          glok sign
│   │   ├── verify.ts        glok verify
│   │   └── submit.ts        glok submit
│   ├── services/
│   │   ├── keyManager.ts    Ed25519 key management
│   │   ├── packager.ts      ZIP archive creation
│   │   ├── signer.ts        Signing + verification
│   │   └── validator.ts     Manifest validation
│   ├── utils/
│   │   ├── fs.ts            File system helpers
│   │   ├── logger.ts        Colored console output
│   │   └── types.ts         Shared TypeScript types
│   └── index.ts             Commander.js CLI setup
├── templates/
│   └── manifest.json        Example manifest template
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

1. Clone the repository
2. `cd CLI-npm && npm install`
3. `npm run build` to compile TypeScript
4. `node bin/glok.js --help` to test locally
5. Or link globally: `npm link`

---

## License

MIT © Glok Team

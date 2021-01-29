# docbits

A single source of truth for documentation, keeping things [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) and maintainable.

## How it works

- Starting in your `-r` or `--root` folder, docbits will look for variables in the format `${variable_name}`.
- For each variable, it will look in your `-b` or `--bitsDirName` folder for a file with a base name matching the variable name.
  - `${foo}` will look for a file in `_bits` matching `foo*`, which could be a file named `foo.md` or `foo.yml` or just `foo`.
- Once found, the variable will be replaced by the exact file contents of the bit.
- Finally, the resulting documentation will be written at `-o` or `--outputDir`, preserving the existing folder structure.

## Installation

```bash
npm install --save-dev docbits
```

## Usage

You can run `docbits` directly from the [CLI](#cli) or it can be imported and run in code via the [API](#api).

### CLI

```zsh
npx docbits --help
```

### API

```ts
import { replaceBits } from 'docbits'

main()

async function main() {
  await replaceBits(/* options */)
}
```

### npm script

```json
{
  "scripts": {
    "docbits": "docbits"
  }
}
```

```zsh
npm run docbits
```

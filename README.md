# docbits

A single source of truth for documentation, keeping things [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) and maintainable.

## How it works

- Starting in your `-r` or `--root` folder, docbits will look for variables in the format `${variable-name}`.
- For each variable, it will look in your `-b` or `--bitsDirName` folder for a file name that matches the variable name (without the extension).
  - `${foo}` will look for a file in `_bits` matching `foo*`, which could be a file named `foo.md` or `foo.yml` or just `foo`.
- Once found, the variable will be replaced by the exact file contents of the bit.
- If not found, no replacement will be made and no errors or warnings will be thrown.
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
import { replaceBits, writeResult } from 'docbits'

main()

async function main() {
  return writeResult(replaceBits())
}
```

You don't have to write the result, if you have something else in mind.

```ts
async function main() {
  for await (const [relativePath, contents] of replaceBits()) {
    // do stuff
  }
}
```

This works, because `replaceBits` is an async generator function, yielding each `relativePath` and `contents` as they become available.

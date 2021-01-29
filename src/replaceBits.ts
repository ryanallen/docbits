import { readFile as _readFile, writeFile as _writeFile } from 'fs'
import { dirname, posix, resolve } from 'path'
import { promisify } from 'util'

import { red } from 'chalk'
import globby from 'globby'
import mkdirp from 'mkdirp'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

type Bits = Map<string | Buffer, string>

export interface ReplaceOptions {
	/**
	 * For each variable, docbits will look here for files with a base name
	 * matching the variable name.
	 * @default "_bits"
	 */
	bitsDirName?: string
	/**
	 * Starting here, docbits will look in files for variables in the format
	 * `${variable_name}`.
	 * @default "./documents"
	 */
	root?: string
}

export interface WriteOptions {
	/**
	 * The resulting files will be written here, preserving the existing folder
	 * structure.
	 * @default "./dist/documents"
	 */
	outputDir?: string
}

export enum DefaultOptions {
	BitsDirName = '_bits',
	Root = './documents',
	OutputDir = './dist/documents',
}

/* istanbul ignore next */
/**
 * Replaces markdown bits in Markdown files that live within `${options.root}`.
 * Searches for bits that match the format `${bit-name}` with content
 * from `${options.bitsDirName}/${bit-name}.md` within the same folder.
 * @param options
 */
export async function* replaceBits({
	bitsDirName = DefaultOptions.BitsDirName,
	root = DefaultOptions.Root,
}: ReplaceOptions = {}) {
	const bitPathsGlob = posix.join(root, `**/${bitsDirName}/*`)
	const bits = await loadBits()

	async function loadBits() {
		const bits: Bits = new Map()
		const bitPaths = await globby(bitPathsGlob)

		await Promise.all(
			bitPaths.map(async (bitPath) => {
				const bp = bitPath.toString()
				bits.set(
					posix.join(posix.dirname(bp), posix.basename(bp)),
					(await readFile(bp)).toString(),
				)
			}),
		)

		return bits
	}

	const docPaths = await globby([posix.join(root, '**'), `!${bitPathsGlob}`])

	for (const docPath of docPaths) {
		const bitPattern = /\${([\w\d-]+)}/g
		const docDir = posix.dirname(docPath)
		const contents = (await readFile(docPath)).toString()

		yield [
			posix.relative(root, docPath),
			contents.replace(bitPattern, (_m, bitName) => {
				const absoluteRoot = posix.resolve(root)
				let currentDir = docDir

				while (true) {
					const bitPath = posix.join(
						currentDir,
						bitsDirName,
						`${bitName}.md`,
					)
					const bit = bits.get(bitPath)
					if (bit) {
						return bit
					}

					const parentDir = posix.resolve(currentDir, '..')
					if (
						currentDir === absoluteRoot ||
						currentDir === parentDir
					) {
						bail()
					}

					currentDir = parentDir
				}

				function bail(): never {
					throw new Error(
						red(
							`bit \${${bitName}} not found relative to ${posix.relative(
								process.cwd(),
								docDir,
							)}`,
						),
					)
				}
			}),
		] as const
	}
}

export async function writeResult(
	files: ReturnType<typeof replaceBits>,
	/* istanbul ignore next */
	{ outputDir = DefaultOptions.OutputDir }: WriteOptions = {},
) {
	await mkdirp(outputDir)

	const writes: Promise<void>[] = []

	for await (const [relativePath, contents] of files) {
		const outputPath = resolve(outputDir, relativePath)
		writes.push(
			mkdirp(dirname(outputPath)).then(() =>
				writeFile(outputPath, contents),
			),
		)
	}

	return Promise.all(writes)
}

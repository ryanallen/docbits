import { readFile as _readFile, writeFile as _writeFile } from 'fs'
import { dirname, posix, resolve } from 'path'
import { promisify } from 'util'

import { red } from 'chalk'
import globby from 'globby'
import mkdirp from 'mkdirp'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

export interface ReplaceOptions {
	/**
	 * For each variable, docbits will look here for file names that match the
	 * variable name (without the extension).
	 * @default "_bits"
	 */
	bitsDirName?: string
	/**
	 * Starting here, docbits will look in files for variables in the format
	 * `${variable-name}`.
	 * @default "./docs"
	 */
	root?: string
}

export interface WriteOptions {
	/**
	 * The resulting files will be written here, preserving the existing folder
	 * structure.
	 * @default "./dist/docs"
	 */
	outputDir?: string
}

export enum DefaultOptions {
	BitsDirName = '_bits',
	Root = './docs',
	OutputDir = './dist/docs',
}

const bitPattern = /\${([\w\d-_]+)}/g

/* istanbul ignore next */
/**
 * Replaces variables in files that live within `${options.root}`.
 * Searches for variables that match the format `${bit-name}` and replaces
 * them with content from matching bits in `${options.bitsDirName}/${bit-name}*`
 * within the same folder.
 * @param options
 */
export async function* replaceBits({
	bitsDirName = DefaultOptions.BitsDirName,
	root = DefaultOptions.Root,
}: ReplaceOptions = {}) {
	const bitPathsGlob = posix.join(root, `**/${bitsDirName}/*`)

	const bits = new Map<string, string>()
	for await (const [bitPath, bitContents] of loadBits()) {
		bits.set(bitPath, bitContents)
	}

	resolveNestedBits()

	for await (const docPath of globby.stream([
		posix.join(root, '**'),
		`!${bitPathsGlob}`,
	])) {
		const dp = docPath.toString()
		yield [
			posix.relative(root, dp),
			replaceContents((await readFile(dp)).toString(), posix.dirname(dp)),
		] as const
	}

	async function* loadBits() {
		for await (const bitPath of globby.sync(bitPathsGlob)) {
			const bp = bitPath.toString()
			yield [
				posix.join(
					posix.dirname(bp),
					posix.basename(bp, posix.extname(bp)),
				),
				(await readFile(bp)).toString(),
			] as const
		}
	}

	function resolveNestedBits() {
		const bitsDirNameLength = bitsDirName.length
		for (const [bitPath, bitContents] of bits.entries()) {
			bits.set(
				bitPath,
				replaceContents(
					bitContents,
					posix.dirname(bitPath).slice(0, bitsDirNameLength * -1),
				),
			)
		}
	}

	function replaceContents(contents: string, docDir: string) {
		return contents.replace(bitPattern, (_m, bitName) => {
			const absoluteRoot = posix.resolve(root)
			let currentDir = docDir

			while (true) {
				const bitPath = posix.join(currentDir, bitsDirName, bitName)
				const bit = bits.get(bitPath)
				if (bit) {
					return bit
				}

				const parentDir = posix.resolve(currentDir, '..')
				if (currentDir === absoluteRoot || currentDir === parentDir) {
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
		})
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

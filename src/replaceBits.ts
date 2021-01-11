import { readFile as _readFile, writeFile as _writeFile } from 'fs'
import { relative, dirname, resolve } from 'path'
import { promisify } from 'util'

import { red } from 'chalk'
import globby from 'globby'
import mkdirp from 'mkdirp'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

type Bits = Map<string | Buffer, string>

interface Options {
	/**
	 * @default "_bits"
	 */
	bitsDirName?: string
	/**
	 * @default "./dist/documents"
	 */
	outputDir?: string
}

/* istanbul ignore next */
/**
 * Replaces markdown bits in Markdown files that live within `docsRoot`.
 * Searches for bits that match the format `${bit-name}` with content
 * from `${options.bitsDirName}/bit-name.md` within the same folder.
 * @param docsRoot defaults to `"./documents"`.
 * @param options
 */
export async function replaceBits(
	docsRoot = './documents',
	{ bitsDirName = '_bits', outputDir = './dist/documents' }: Options = {},
) {
	await mkdirp(outputDir)

	const bitPathsGlob = `${docsRoot}/**/${bitsDirName}/*.md`
	const bits = await loadBits()

	return _replaceBits()

	async function loadBits() {
		const bits: Bits = new Map()
		const bitPaths = await globby(bitPathsGlob)

		await Promise.all(
			bitPaths.map(async (bitPath) => {
				bits.set(
					bitPath.toString(),
					(await readFile(bitPath)).toString(),
				)
			}),
		)

		return bits
	}
	async function _replaceBits() {
		const docPaths = await globby([
			`${docsRoot}/**/*.md`,
			`!${bitPathsGlob}`,
		])

		return Promise.all(docPaths.map(replaceBit))

		async function replaceBit(docPath: string) {
			const bitPattern = /\${([\w\d-]+)}/g
			const docDir = dirname(docPath)
			const contents = (await readFile(docPath)).toString()
			const outputPath = resolve(outputDir, relative(docsRoot, docPath))

			await mkdirp(dirname(outputPath))

			return writeFile(
				outputPath,
				contents.replace(bitPattern, (_m, bitName) => {
					const absoluteDocsRoot = resolve(docsRoot)
					let currentDir = docDir

					while (true) {
						const bitPath = `${currentDir}/${bitsDirName}/${bitName}.md`
						const bit = bits.get(bitPath)
						if (bit) {
							return bit
						}

						const parentDir = resolve(currentDir, '..')
						if (
							currentDir === absoluteDocsRoot ||
							currentDir === parentDir
						) {
							bail()
						}

						currentDir = parentDir
					}

					function bail() {
						throw new Error(
							red(
								`bit \${${bitName}} not found relative to ${relative(
									process.cwd(),
									docDir,
								)}`,
							),
						)
					}
				}),
			)
		}
	}
}

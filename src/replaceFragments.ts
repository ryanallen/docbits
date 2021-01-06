import { readFile as _readFile, writeFile as _writeFile } from 'fs'
import { relative, dirname, resolve } from 'path'
import { promisify } from 'util'

import { red } from 'chalk'
import globby from 'globby'
import mkdirp from 'mkdirp'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

type Fragments = Map<string | Buffer, string>

interface Options {
	/**
	 * @default "_fragments"
	 */
	fragmentsDirName?: string
	/**
	 * @default "./dist/documents"
	 */
	outputDir?: string
}

/* istanbul ignore next */
/**
 * Replaces markdown fragments in Markdown files that live within `docsRoot`.
 * Searches for fragments that match the format `${fragment-name}` with content
 * from `${options.fragmentsDirName}/fragment-name.md` within the same folder.
 * @param docsRoot defaults to `"./documents"`.
 * @param options
 */
export async function replaceFragments(
	docsRoot = './documents',
	{
		fragmentsDirName = '_fragments',
		outputDir = './dist/documents',
	}: Options = {},
) {
	await mkdirp(outputDir)

	const fragmentPathsGlob = `${docsRoot}/**/${fragmentsDirName}/*.md`
	const fragments = await loadFragments()

	return _replaceFragments()

	async function loadFragments() {
		const fragments: Fragments = new Map()
		const fragmentPaths = await globby(fragmentPathsGlob)

		await Promise.all(
			fragmentPaths.map(async (fragmentPath) => {
				fragments.set(
					fragmentPath.toString(),
					(await readFile(fragmentPath)).toString(),
				)
			}),
		)

		return fragments
	}

	async function _replaceFragments() {
		const docPaths = await globby([
			`${docsRoot}/**/*.md`,
			`!${fragmentPathsGlob}`,
		])

		return Promise.all(docPaths.map(replaceFragment))

		async function replaceFragment(docPath: string) {
			const fragmentPattern = /\${([\w\d-]+)}/g
			const docDir = dirname(docPath)
			const contents = (await readFile(docPath)).toString()
			const outputPath = resolve(outputDir, relative(docsRoot, docPath))

			await mkdirp(dirname(outputPath))

			return writeFile(
				outputPath,
				contents.replace(fragmentPattern, (_m, fragmentName) => {
					const absoluteDocsRoot = resolve(docsRoot)
					let currentDir = docDir

					while (true) {
						const fragmentPath = `${currentDir}/${fragmentsDirName}/${fragmentName}.md`
						const fragment = fragments.get(fragmentPath)
						if (fragment) {
							return fragment
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
								`fragment \${${fragmentName}} not found relative to ${relative(
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

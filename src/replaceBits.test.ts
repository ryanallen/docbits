import { readFile as _readFile } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

import mkdirp from 'mkdirp'

import pkg from '../package.json'

import { replaceBits, writeResult } from './replaceBits'

const readFile = promisify(_readFile)

describe(replaceBits.name, () => {
	const fixturesPath = 'src/__fixtures__'

	it('replaces nested bits', async () => {
		const result: [string, string][] = []

		for await (const [relativePath, contents] of replaceBits({
			root: `${fixturesPath}/nested`,
		})) {
			result.push([relativePath, contents])
		}

		expect(result).toMatchSnapshot()
	})

	it('does not replace or throw if bit does not exist', async () => {
		const result: [string, string][] = []

		for await (const [relativePath, contents] of replaceBits({
			root: `${fixturesPath}/missing-bit`,
		})) {
			result.push([relativePath, contents])
		}

		expect(result).toMatchSnapshot()
	})
})

describe(writeResult.name, () => {
	const fixturesPath = 'src/__fixtures__'
	const outputDir = join(tmpdir(), pkg.name)

	mkdirp.sync(outputDir)

	describe('nested bits', () => {
		beforeAll(() =>
			writeResult(
				replaceBits({
					root: `${fixturesPath}/nested`,
				}),
				{ outputDir },
			),
		)

		test('home', async () => {
			const buffer = await readFile(`${outputDir}/home.md`)

			expect(buffer.toString()).toMatch('root table of contents')
		})

		test('project-x', async () => {
			const buffer = await readFile(`${outputDir}/project-x/home.md`)

			expect(buffer.toString()).toMatch('table of contents for project-x')
		})
	})
})

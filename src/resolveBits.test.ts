import { readFile as _readFile } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

import mkdirp from 'mkdirp'

import pkg from '../package.json'

import { resolveBits, writeResult } from './resolveBits'

const readFile = promisify(_readFile)

describe(resolveBits.name, () => {
	const fixturesPath = 'src/__fixtures__'

	it('resolves nested bits', async () => {
		const result: [string, string][] = []

		for await (const [relativePath, contents] of resolveBits({
			root: `${fixturesPath}/nested`,
		})) {
			result.push([relativePath, contents])
		}

		expect(result).toMatchSnapshot()
	})

	it("throws if bit doesn't exist", async () => {
		return expect(async () => {
			for await (const [] of resolveBits({
				root: `${fixturesPath}/missing-bit`,
			})) {
				continue
			}
		}).rejects.toThrow('bit ${does-not-exist} not found relative to')
	})
})

describe(writeResult.name, () => {
	const fixturesPath = 'src/__fixtures__'
	const outputDir = join(tmpdir(), pkg.name)

	mkdirp.sync(outputDir)

	describe('nested bits', () => {
		beforeAll(() =>
			writeResult(
				resolveBits({
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

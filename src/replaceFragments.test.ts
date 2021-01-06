import { readFile as _readFile } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

import mkdirp from 'mkdirp'

import pkg from '../package.json'

import { replaceFragments } from './replaceFragments'

const readFile = promisify(_readFile)

describe(replaceFragments.name, () => {
	const fixturesPath = 'src/__fixtures__'
	const outputDir = join(tmpdir(), pkg.name)

	mkdirp.sync(outputDir)

	describe('nested fragments', () => {
		beforeAll(() =>
			replaceFragments(`${fixturesPath}/nested`, {
				outputDir,
			}),
		)

		test('home', async () => {
			const buffer = await readFile(`${outputDir}/home.md`)

			expect(buffer.toString()).toMatchSnapshot()
		})

		test('project-x', async () => {
			const buffer = await readFile(`${outputDir}/project-x/home.md`)

			expect(buffer.toString()).toMatchSnapshot()
		})
	})

	it("throws if fragment doesn't exist", () => {
		return expect(
			replaceFragments(`${fixturesPath}/missing-fragment`, {
				outputDir,
			}),
		).rejects.toThrow('fragment ${does-not-exist} not found relative to')
	})
})

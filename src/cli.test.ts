import { posix, relative } from 'path'

import { red } from 'chalk'

// @ts-ignore when building
import pkg from '../package.json'

import { cli } from './cli'

describe(cli.name, () => {
	const noop = jest.fn()
	const consoleLog = jest.spyOn(console, 'log').mockImplementation(noop)
	const consoleError = jest.spyOn(console, 'error').mockImplementation(noop)

	beforeEach(() => {
		consoleLog.mockClear()
		consoleError.mockClear()
	})

	afterAll(() => {
		consoleLog.mockRestore()
		consoleError.mockRestore()
	})

	describe('when called with no arguments', () => {
		it('does not throw', async () => {
			await cli()
			expect(consoleError).not.toHaveBeenCalledWith()
		})
	})

	describe.each(['-v', '--version'])(
		'when called with the %s option',
		(option) => {
			it('prints version information', async () => {
				await cli([option])
				expect(consoleLog).toHaveBeenCalledWith(
					`${pkg.name}@${pkg.version}`,
				)
			})
		},
	)

	describe.each(['-h', '--help'])(
		'when called with the %s option',
		(option) => {
			it('prints help information', async () => {
				await cli([option])
				expect(consoleLog.mock.calls).toEqual([
					[pkg.description],
					[],
					['Usage:'],
					['  docbits [options]'],
					[],
					['Options:'],
					['  -h, --help'],
					['  -v, --version'],
					['  -b, --bitsDirName  default: "_bits"'],
					['  -r, --root         default: "./docs"'],
					['  -o, --outputDir    default: "./dist/docs"'],
				])
			})
		},
	)

	describe('when called with an unidentified "foo" argument', () => {
		it('logs a "too many arguments" error', async () => {
			await cli(['foo'])
			expect(consoleError).toHaveBeenCalledWith(red('too many arguments'))
		})
	})

	describe('missing bit scenario', () => {
		it('logs the error', async () => {
			const location = posix.join(
				relative(process.cwd(), __dirname),
				'__fixtures__',
				'missing-bit',
			)
			await cli(['--root', location])
			expect((consoleError.mock.calls[0] as [string])[0]).toMatch(
				'bit ${does-not-exist} not found relative to',
			)
		})
	})
})

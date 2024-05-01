import { readFile } from 'node:fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import * as prettier from 'prettier'

import { parsers } from '../src/index.js'
import { parse as acorn_parse } from './acorn_reference.js'
import { should_throw } from './throwers.js'
import { replacePlaceholders } from './prettier_compat.js'

const DEBUG = process.env.DEBUG ?? false
const corpus_dirname = process.env.CORPUS ?? 'corpus'

const test_dir = path.dirname(url.fileURLToPath(import.meta.url))
const corpus_dir = path.join(test_dir, corpus_dirname)
//const corpus_dir = path.join(test_dir, 'ambition')

const dir = fs.readdirSync(corpus_dir, { withFileTypes: true })

const base_ts_opts = {
    parser: 'tree-sitter',
    plugins: [{ parsers }],
}

const ts_parse = parsers['tree-sitter'].parse

const base_acorn_opts = {
    parser: 'custom-acorn',
    plugins: [
        {
            parsers: {
                'custom-acorn': {
                    ...parsers['tree-sitter'],
                    parse: acorn_parse,
                },
            },
        },
    ],
}

const files = dir.flatMap((file) => {
    const basename = file.name
    const filename = path.join(corpus_dir, basename)
    if (
        path.extname(basename) === '.snap' ||
        !file.isFile() ||
        basename[0] === '.' ||
        // VSCode creates this file sometime https://github.com/microsoft/vscode/issues/105191
        basename === 'debug.log'
    ) {
        return []
    }
    return [{ basename, filename }]
})

test('smoke test', async () => {
    const formatted_ts = await prettier.format('lodash ( )', base_ts_opts)
    expect(formatted_ts).toBe('lodash();\n')
    const formatted_acorn = await prettier.format('lodash ( )', base_acorn_opts)
    expect(formatted_acorn).toBe('lodash();\n')
})

const pare_acorn_tree = (obj) =>
    JSON.parse(
        JSON.stringify(obj, function (key, value) {
            if (this.type === 'TemplateElement' && key === 'value')
                return { raw: value.raw }
            if (this.type === 'Program' && key === 'sourceType')
                return undefined
            if (this.type === 'Literal' && ['bigint'].includes(key))
                return undefined

            return value
        })
    )

describe('corpus test', () => {
    files.map(({ basename: name, filename }) => {
        let _text
        let ts_opts, acorn_opts
        const get_text = async () => {
            if (_text != null) return _text
            const pre_processed = await readFile(filename, 'utf8')
            const replaced = replacePlaceholders(pre_processed, base_acorn_opts)
            _text = replaced.text
            acorn_opts = replaced.options
            ts_opts = {
                ...acorn_opts,
                ...base_ts_opts,
            }

            return _text
        }

        if (should_throw.some((shorter_name) => name.includes(shorter_name))) {
            test(`Should throw: ${name}`, async () => {
                const text = await get_text()
                await expect(
                    async () => await prettier.format(text, acorn_opts)
                ).rejects.toThrow()
                await expect(
                    async () => await prettier.format(text, ts_opts)
                ).rejects.toThrow()
            })
            return
        }

        // test(`Reference should not throw: ${name}`, async () => {
        //     try {
        //         await prettier.format(text, acorn_opts)
        //     } catch (e) {
        //         expect(e).toBe(undefined)
        //     }
        // })
        test(`AST match: ${name}`, async () => {
            const text = await get_text()
            const ts_ast = ts_parse(text)

            if (DEBUG) console.log(JSON.stringify(ts_ast, null, 4))
            let acorn_ast = acorn_parse(text)
            acorn_ast = pare_acorn_tree(acorn_ast)
            if (DEBUG) console.log('acorn_ast;')
            if (DEBUG) console.log(JSON.stringify(acorn_ast, null, 4))
            expect(ts_ast).toMatchObject(acorn_ast)
        })
        test(`Prettier match: ${name}`, async () => {
            const text = await get_text()
            let formatted_ts
            try {
                formatted_ts = await prettier.format(text, ts_opts)
            } catch (e) {
                console.error(e)
                expect(e).toBe({})
            }
            const formatted_acorn = await prettier.format(text, acorn_opts)
            expect(formatted_ts).toBe(formatted_acorn)
        })
    })
})

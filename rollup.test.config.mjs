import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
// import del from "rollup-plugin-delete";
// import {
//     terser
// } from "rollup-plugin-terser";
// import summary from "rollup-plugin-summary";
// import pkg from "./package.json";

import { readFile } from 'fs/promises';
const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url)));

const bundleComponents = true;
const production = !process.env.ROLLUP_WATCH;

const name = pkg.name
    .replace(/^(@\S+\/)?(svelte-)?(\S+)/, "$3")
    .replace(/^\w/, (m) => m.toUpperCase())
    .replace(/-\w/g, (m) => m[1].toUpperCase());

export default [{
    input: "src/dge-test.wc.js",
    output: bundleComponents ? [{
            file: pkg['module-test'],
            format: "es"
        },
        {
            file: pkg['main-test'],
            format: "umd",
            name
        },
    ] : [{
        dir: "dist/",
        format: "es",
        chunkFileNames: "[name].js",
        manualChunks: {
            svelte: ["svelte"]
        },
    }, ],
    plugins: [
        svelte({
            // compile only *.wc.svelte files as web components
            // include: 'DGE-Chart.wc.svelte',
            include: /\.wc\.svelte$/,
            compilerOptions: {
                // enable run-time checks when not in production
                dev: !production,
                customElement: true,
            },
        }),
        svelte({
            exclude: /\.wc\.svelte$/,
            compilerOptions: {
                // enable run-time checks when not in production
                dev: !production,
            },
        }),
        resolve({
            browser: true,
            dedupe: ['svelte']
        }),
        commonjs(),
        terser(),
        // summary(),
    ],
}];
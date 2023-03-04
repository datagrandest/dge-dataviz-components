import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
// import builtins from 'rollup-plugin-node-builtins';
import pkg from './package.json';
// import css from 'rollup-plugin-css-only';

const name = pkg.name
    .replace(/^(@\S+\/)?(svelte-)?(\S+)/, '$3')
    .replace(/^\w/, m => m.toUpperCase())
    .replace(/-\w/g, m => m[1].toUpperCase());

export default {
    input: 'src/index.js',
    output: [{
            file: pkg.module,
            'format': 'es'
        },
        {
            file: pkg.main,
            'format': 'umd',
            name
        }
    ],
    plugins: [
        // css({ output: 'style.css' }),
        svelte({
            // customElement: true,
            compilerOptions: {

                // You can optionally set 'customElement' to 'true' to compile
                // your components to custom elements (aka web elements)
                customElement: true
            }
        }),
        resolve({
            browser: true,
            dedupe: ['svelte']
        }),
        // resolve(),
        // commonjs({
        //     include: ["node_modules/**"]
        // }),
        commonjs(),
        // builtins()
    ],
    // onwarn: function(warning, superOnWarn) {
    //     /*
    //     * skip certain warnings
    //     * https://github.com/openlayers/openlayers/issues/10245
    //     */
    //     if (warning.code === 'THIS_IS_UNDEFINED') {
    //         return;
    //     }
    //     superOnWarn(warning);
    // }
};
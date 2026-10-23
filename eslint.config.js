import js from "@eslint/js";

export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            "no-console": "warn",
            "no-debugger": "error",
            "no-eval": "error",
            "prefer-const": "warn",
        },
    },
];

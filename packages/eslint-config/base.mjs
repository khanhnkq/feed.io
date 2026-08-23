import eslint from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { boundaries },
    rules: {
      "max-lines": ["error", { max: 500, skipBlankLines: false, skipComments: false }],
      "boundaries/no-unknown": "off"
    },
  },
  { ignores: ["**/generated/**", "**/.next/**", "**/node_modules/**"] },
);

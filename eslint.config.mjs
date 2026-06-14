import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disallow raw SQL string interpolation — enforce parameterized Drizzle queries.
      // (Drizzle''s `sql` template is parameterized; `sql.raw` is the escape hatch we forbid.)
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name=''sql''][property.name=''raw'']",
          message:
            "sql.raw() is forbidden: use parameterized Drizzle queries / the sql`` template instead.",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/db/migrations/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
    ],
  },
];

export default eslintConfig;

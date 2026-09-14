import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/deploy-commands.ts"],
  format: ["cjs"],
  clean: true,
  target: "es2022",
  sourcemap: true,
});

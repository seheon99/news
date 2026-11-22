import { registerHooks } from "node:module";

const src = new URL("../src/", import.meta.url);

registerHooks({
  resolve: (specifier, context, next) =>
    next(
      specifier.startsWith("@/")
        ? new URL(specifier.slice(2), src).href
        : specifier,
      context,
    ),
});

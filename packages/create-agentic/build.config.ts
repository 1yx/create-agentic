import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["./src/cli"],
  declaration: false,
  clean: true,
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
  },
});

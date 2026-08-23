import { defineConfig } from "orval";

export default defineConfig({
  feedio: {
    input: "../../apps/backend/openapi.json",
    output: {
      target: "./src/generated/endpoints",
      schemas: "./src/generated/models",
      client: "react-query",
      httpClient: "axios",
      mode: "tags-split",
      clean: true,
      override: {
        mutator: {
          path: "./src/axios_instance.ts",
          name: "axiosInstance",
        },
      },
    },
  },
});

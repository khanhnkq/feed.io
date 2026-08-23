import { defineConfig } from "orval";

export default defineConfig({
  feedio: {
    input: "../../apps/backend/openapi.json",
    output: {
      target: "./src/generated/feedio.ts",
      schemas: "./src/generated/models",
      client: "react-query",
      httpClient: "axios",
      mode: "single",
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

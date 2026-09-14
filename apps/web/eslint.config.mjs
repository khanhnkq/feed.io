import config from "@feedio/eslint-config/next";

export default [
  ...config,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];



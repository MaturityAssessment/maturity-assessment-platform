import type { StorybookConfig } from "@storybook/nextjs";

// Next.js 14 can replace Storybook's Webpack resolution while loading
// next.config, which results in duplicate Webpack instances and missing hooks.
// Storybook's Next.js integration uses this render-worker flag to avoid that
// override during the Storybook build.
process.env.__NEXT_PRIVATE_RENDER_WORKER ??= "defined";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;

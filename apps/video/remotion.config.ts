import fs from "node:fs";
import { Config } from "@remotion/cli/config";

const CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (fs.existsSync(CHROME_MAC)) {
  Config.setBrowserExecutable(CHROME_MAC);
}

Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setOverwriteOutput(true);

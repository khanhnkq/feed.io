import type { VideoCopy } from "../copy/types";
import type { LayoutMode } from "../theme/tokens";

export interface SceneProps {
  copy: VideoCopy;
  layout: LayoutMode;
  durationInFrames: number;
  previewMode?: boolean;
}

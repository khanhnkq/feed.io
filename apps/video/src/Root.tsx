import React from "react";
import { Composition } from "remotion";
import { FeediLaunchComposition, LaunchVideoPropsSchema } from "./Composition";
import { getTimelineSchedule } from "./timeline/schedule";

export function RemotionRoot() {
  const landscape = getTimelineSchedule("landscape");
  const portrait = getTimelineSchedule("portrait");

  return (
    <>
      <Composition
        id="FeediLaunch-16x9-EN"
        component={FeediLaunchComposition}
        durationInFrames={landscape.totalFrames}
        fps={landscape.fps}
        width={landscape.width}
        height={landscape.height}
        schema={LaunchVideoPropsSchema}
        defaultProps={{ locale: "en", layout: "landscape" }}
      />
      <Composition
        id="FeediLaunch-9x16-EN"
        component={FeediLaunchComposition}
        durationInFrames={portrait.totalFrames}
        fps={portrait.fps}
        width={portrait.width}
        height={portrait.height}
        schema={LaunchVideoPropsSchema}
        defaultProps={{ locale: "en", layout: "portrait" }}
      />
    </>
  );
}

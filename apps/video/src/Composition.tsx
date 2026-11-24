import React from "react";
import { AbsoluteFill, Audio, Series, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { getCopy } from "./copy";
import { Act1Hook } from "./scenes/Act1Hook";
import { Act2LiveProof } from "./scenes/Act2LiveProof";
import { Act3PlayerAnnotate } from "./scenes/Act3PlayerAnnotate";
import { Act4VersionCompare } from "./scenes/Act4VersionCompare";
import { Act5ShareApprove } from "./scenes/Act5ShareApprove";
import { Act6ArchitecturePricing } from "./scenes/Act6ArchitecturePricing";
import { Act7Outro } from "./scenes/Act7Outro";
import { TOKENS } from "./theme/tokens";
import { getTimelineSchedule } from "./timeline/schedule";

export const LaunchVideoPropsSchema = z.object({
  locale: z.enum(["en", "vi"]).default("en"),
  layout: z.enum(["landscape", "portrait"]).default("landscape"),
});

export type LaunchVideoProps = z.infer<typeof LaunchVideoPropsSchema>;

export function FeediLaunchComposition({ locale, layout }: LaunchVideoProps) {
  const frame = useCurrentFrame();
  const copy = getCopy(locale);
  const schedule = getTimelineSchedule(layout);
  const audioSrc =
    layout === "landscape"
      ? staticFile("audio/soundtrack_16x9.wav")
      : staticFile("audio/soundtrack_9x16.wav");
  const progressPct = ((frame + 1) / schedule.totalFrames) * 100;

  return (
    <AbsoluteFill style={{ backgroundColor: TOKENS.colors.ink }}>
      <Audio src={audioSrc} />
      <Series>
        <Series.Sequence durationInFrames={schedule.acts.act1.duration}>
          <Act1Hook copy={copy} layout={layout} durationInFrames={schedule.acts.act1.duration} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={schedule.acts.act2.duration}>
          <Act2LiveProof copy={copy} layout={layout} durationInFrames={schedule.acts.act2.duration} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={schedule.acts.act3.duration}>
          <Act3PlayerAnnotate copy={copy} layout={layout} durationInFrames={schedule.acts.act3.duration} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={schedule.acts.act4.duration}>
          <Act4VersionCompare copy={copy} layout={layout} durationInFrames={schedule.acts.act4.duration} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={schedule.acts.act5.duration}>
          <Act5ShareApprove copy={copy} layout={layout} durationInFrames={schedule.acts.act5.duration} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={schedule.acts.act6.duration}>
          <Act6ArchitecturePricing copy={copy} layout={layout} durationInFrames={schedule.acts.act6.duration} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={schedule.acts.act7.duration}>
          <Act7Outro copy={copy} layout={layout} durationInFrames={schedule.acts.act7.duration} />
        </Series.Sequence>
      </Series>

      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 6,
          width: `${progressPct}%`,
          backgroundColor: TOKENS.colors.lime,
          zIndex: 100,
        }}
      />
    </AbsoluteFill>
  );
}

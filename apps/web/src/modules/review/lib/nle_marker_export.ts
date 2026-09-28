import { formatSMPTETimecode } from "./timecode";

export interface MarkerExportItem {
  id: string;
  content: string;
  timestamp_seconds: number | null | undefined;
  author_name?: string;
  status?: string;
}

/**
 * Escapes CSV values for safe output.
 */
function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return `"${val}"`;
}

/**
 * Generates Adobe Premiere Pro compatible marker CSV.
 */
export function generatePremiereCSV(
  items: MarkerExportItem[],
  fps = 24,
  _title = "Feedi Markers",
): string {
  const header = "Marker Name,Description,In,Out,Duration,Marker Type";
  const validItems = items.filter(
    (item) => typeof item.timestamp_seconds === "number" && item.timestamp_seconds >= 0,
  );

  const rows = validItems.map((item) => {
    const seconds = item.timestamp_seconds ?? 0;
    const tc = formatSMPTETimecode(seconds, fps);
    const author = item.author_name ? ` by ${item.author_name}` : "";
    const name = escapeCSV(`Note${author}`);
    const desc = escapeCSV(item.content);
    const duration = formatSMPTETimecode(1 / fps, fps);
    return `${name},${desc},${tc},${tc},${duration},Comment`;
  });

  return [header, ...rows].join("\n");
}

/**
 * Generates DaVinci Resolve compatible marker CSV.
 */
export function generateDaVinciCSV(
  items: MarkerExportItem[],
  fps = 24,
): string {
  const header = "Timecode,Name,Notes,Color";
  const validItems = items.filter(
    (item) => typeof item.timestamp_seconds === "number" && item.timestamp_seconds >= 0,
  );

  const rows = validItems.map((item) => {
    const seconds = item.timestamp_seconds ?? 0;
    const tc = formatSMPTETimecode(seconds, fps);
    const author = item.author_name ? ` (${item.author_name})` : "";
    const name = escapeCSV(`Feedi Feedback${author}`);
    const notes = escapeCSV(item.content);
    const color = item.status === "resolved" ? "Green" : "Blue";
    return `${tc},${name},${notes},${color}`;
  });

  return [header, ...rows].join("\n");
}

/**
 * Generates standard CMX 3600 EDL with locator/comment markers for video editors.
 */
export function generateEDL(
  items: MarkerExportItem[],
  fps = 24,
  title = "FEEDIO_MARKERS",
): string {
  const lines: string[] = [
    `TITLE: ${title.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`,
    "FCM: NON-DROP FRAME",
    "",
  ];

  const validItems = items
    .filter((item) => typeof item.timestamp_seconds === "number" && item.timestamp_seconds >= 0)
    .sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));

  validItems.forEach((item, idx) => {
    const eventNum = String(idx + 1).padStart(3, "0");
    const seconds = item.timestamp_seconds ?? 0;
    const tcIn = formatSMPTETimecode(seconds, fps);
    const tcOut = formatSMPTETimecode(seconds + 1 / fps, fps);
    const author = item.author_name ? ` [${item.author_name}]` : "";

    lines.push(`${eventNum}  AX       V     C        ${tcIn} ${tcOut} ${tcIn} ${tcOut}`);
    lines.push(`* FROM CLIP NAME: ${title}`);
    lines.push(`* LOC: ${tcIn} BLUE ${item.content}${author}`);
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Generates Final Cut Pro FCPXML marker sequence.
 */
export function generateFCPXML(
  items: MarkerExportItem[],
  fps = 24,
  title = "Feedi Markers",
): string {
  const validItems = items.filter(
    (item) => typeof item.timestamp_seconds === "number" && item.timestamp_seconds >= 0,
  );

  const roundedFps = Math.round(fps);
  const frameDur = `1/${roundedFps}s`;

  const markersXml = validItems
    .map((item) => {
      const sec = item.timestamp_seconds ?? 0;
      const totalFrames = Math.floor(sec * roundedFps);
      const start = `${totalFrames}/${roundedFps}s`;
      const author = item.author_name ? ` - ${item.author_name}` : "";
      const val = `${item.content}${author}`
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return `              <marker start="${start}" duration="${frameDur}" value="${val}" />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" frameDuration="${frameDur}" />
  </resources>
  <library>
    <event name="Feedi Export">
      <project name="${title}">
        <sequence duration="3600s" format="r1">
          <spine>
            <gap name="Feedi Timeline Gap" offset="0s" duration="3600s" start="0s">
${markersXml}
            </gap>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

/**
 * Triggers a browser file download of arbitrary string data.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

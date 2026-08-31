/**
 * Vector Annotation types and serializers for canvas drawing overlays.
 */

export type AnnotationTool = "select" | "brush" | "arrow" | "rect" | "circle" | "text";

export interface BaseShape {
  id: string;
  color: string;
  strokeWidth: number;
}

export interface BrushShape extends BaseShape {
  type: "brush";
  points: number[]; // [x0, y0, x1, y1, ...] in normalized percentage [0..100]
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  startX: number; // percentage [0..100]
  startY: number;
  endX: number;
  endY: number;
}

export interface RectShape extends BaseShape {
  type: "rect";
  x: number; // percentage [0..100]
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: "circle";
  cx: number; // percentage [0..100]
  cy: number;
  rx: number;
  ry: number;
}

export interface TextShape extends BaseShape {
  type: "text";
  x: number; // percentage [0..100]
  y: number;
  text: string;
  fontSize: number;
}

export type AnnotationShape =
  | BrushShape
  | ArrowShape
  | RectShape
  | CircleShape
  | TextShape;

export interface AnnotationData {
  version: 1;
  shapes: AnnotationShape[];
}

export function serializeAnnotations(shapes: AnnotationShape[]): Record<string, unknown> | null {
  if (!shapes || shapes.length === 0) {
    return null;
  }
  const data: AnnotationData = {
    version: 1,
    shapes,
  };
  return data as unknown as Record<string, unknown>;
}

export function deserializeAnnotations(data: unknown): AnnotationShape[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const typed = data as { shapes?: AnnotationShape[] };
  if (Array.isArray(typed.shapes)) {
    return typed.shapes;
  }
  return [];
}

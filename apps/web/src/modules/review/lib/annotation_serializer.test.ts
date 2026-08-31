import { describe, expect, it } from "vitest";
import {
  type AnnotationShape,
  deserializeAnnotations,
  serializeAnnotations,
} from "./annotation_serializer";

describe("Annotation Serializer", () => {
  const shapes: AnnotationShape[] = [
    {
      id: "shape-1",
      type: "brush",
      points: [10, 20, 15, 25, 20, 30],
      color: "#D8FF43",
      strokeWidth: 3,
    },
    {
      id: "shape-2",
      type: "rect",
      x: 30,
      y: 40,
      width: 25,
      height: 20,
      color: "#EF4444",
      strokeWidth: 2,
    },
    {
      id: "shape-3",
      type: "arrow",
      startX: 5,
      startY: 5,
      endX: 20,
      endY: 20,
      color: "#FFFFFF",
      strokeWidth: 2,
    },
  ];

  it("serializes and deserializes vector shapes faithfully", () => {
    const serialized = serializeAnnotations(shapes);
    expect(serialized).not.toBeNull();
    const deserialized = deserializeAnnotations(serialized);
    expect(deserialized).toEqual(shapes);
  });

  it("handles empty shapes gracefully", () => {
    expect(serializeAnnotations([])).toBeNull();
    expect(deserializeAnnotations(null)).toEqual([]);
    expect(deserializeAnnotations({})).toEqual([]);
  });
});

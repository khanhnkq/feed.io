import { describe, expect, it } from "vitest";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from "./table";

describe("Table UI components", () => {
  it("renders TableContainer with rounded border styling and scroll wrapper", () => {
    const el = TableContainer({ children: "Table Content" });
    expect(el.type).toBe("div");
    expect(el.props.className).toContain("overflow-hidden");
    expect(el.props.className).toContain("border-line");
  });

  it("renders semantic Table component", () => {
    const el = Table({ children: "Content" });
    expect(el.type).toBe("table");
    expect(el.props.className).toContain("w-full");
    expect(el.props.className).toContain("text-[14px]");
  });

  it("renders TableHeader, TableBody, TableRow, TableHead, and TableCell", () => {
    const head = TableHeader({ children: "Header" });
    expect(head.type).toBe("thead");
    expect(head.props.className).toContain("bg-[#fafbf7]");

    const body = TableBody({ children: "Body" });
    expect(body.type).toBe("tbody");
    expect(body.props.className).toContain("divide-y");

    const row = TableRow({ children: "Row", isClickable: true });
    expect(row.type).toBe("tr");
    expect(row.props.className).toContain("cursor-pointer");

    const th = TableHead({ children: "Column", align: "right" });
    expect(th.type).toBe("th");
    expect(th.props.className).toContain("text-right");
    expect(th.props.scope).toBe("col");

    const td = TableCell({ children: "Value", align: "center" });
    expect(td.type).toBe("td");
    expect(td.props.className).toContain("text-center");
  });

  it("renders standalone TableEmptyState with title and description", () => {
    const el = TableEmptyState({
      title: "No members",
      description: "Invite your team to get started.",
      variant: "standalone",
    });
    expect(el.type).toBe("section");
    expect(el.props.className).toContain("border-dashed");
    expect(el.props["aria-label"]).toBe("No members");
  });

  it("renders embedded TableEmptyState inside a table row/cell", () => {
    const el = TableEmptyState({
      title: "No records found",
      variant: "embedded",
      colSpan: 4,
    });
    expect(el.type).toBe("tr");
    expect(el.props.children.props.colSpan).toBe(4);
  });

  it("renders TableSkeleton placeholder rows", () => {
    const el = TableSkeleton({ columnsCount: 3, rowsCount: 2 });
    expect(el.type).toBe(TableBody);
    expect(el.props.children).toHaveLength(2);
  });
});

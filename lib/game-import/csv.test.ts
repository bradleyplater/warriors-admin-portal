import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("splits plain rows and fields", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps the last row without a trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv(",x,,\n")).toEqual([["", "x", "", ""]]);
  });

  it("reads quoted fields with commas, newlines and escaped quotes", () => {
    expect(parseCsv('"a,b","say ""hi""","line\nbreak"\n')).toEqual([
      ["a,b", 'say "hi"', "line\nbreak"],
    ]);
  });

  it("strips a UTF-8 BOM", () => {
    expect(parseCsv("﻿a,b\n")).toEqual([["a", "b"]]);
  });
});

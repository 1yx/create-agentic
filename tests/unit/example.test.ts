import { describe, it, expect } from "vitest";
import { hello } from "../src/index.js";

describe("hello", () => {
  it("should return greeting message", () => {
    expect(hello("World")).toBe("Hello, World!");
  });
});

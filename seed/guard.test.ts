import { describe, expect, it } from "vitest";
import { assertLocalOrAllowed } from "./guard";

describe("assertLocalOrAllowed", () => {
  it("allows a localhost URI", () => {
    expect(() =>
      assertLocalOrAllowed("mongodb://localhost:27017/HockeyTracker", []),
    ).not.toThrow();
  });

  it("allows a 127.0.0.1 URI", () => {
    expect(() =>
      assertLocalOrAllowed("mongodb://127.0.0.1:27017/HockeyTracker", []),
    ).not.toThrow();
  });

  it("allows the docker-compose 'mongo' hostname", () => {
    expect(() =>
      assertLocalOrAllowed("mongodb://mongo:27017/HockeyTracker", []),
    ).not.toThrow();
  });

  it("rejects a non-local hostname", () => {
    expect(() =>
      assertLocalOrAllowed(
        "mongodb://prod.example.com:27017/HockeyTracker",
        [],
      ),
    ).toThrow(/does not look local/);
  });

  it("allows a non-local hostname when --allow-remote is passed", () => {
    expect(() =>
      assertLocalOrAllowed("mongodb://prod.example.com:27017/HockeyTracker", [
        "--allow-remote",
      ]),
    ).not.toThrow();
  });

  it("rejects an invalid URI", () => {
    expect(() => assertLocalOrAllowed("not-a-valid-uri", [])).toThrow(
      /not a valid URI/,
    );
  });

  it("skips URI validation entirely when --allow-remote is passed", () => {
    expect(() =>
      assertLocalOrAllowed("not-a-valid-uri", ["--allow-remote"]),
    ).not.toThrow();
  });
});

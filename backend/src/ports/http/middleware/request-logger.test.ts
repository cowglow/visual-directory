import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestLogger } from "./request-logger.js";

describe("requestLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs method, path, status and duration once the response finishes", async () => {
    const app = express();
    app.use(requestLogger);
    app.get("/health", (_req, res) => res.json({ ok: true }));
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const res = await fetch(`http://localhost:${port}/health`);
      await res.json();
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health 200 \d+ms$/));
    } finally {
      server.close();
    }
  });

  it("logs the response status code even when the route errors", async () => {
    const app = express();
    app.use(requestLogger);
    app.get("/boom", (_req, res) => res.status(500).json({ error: "boom" }));
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await fetch(`http://localhost:${port}/boom`);
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^GET \/boom 500 \d+ms$/));
    } finally {
      server.close();
    }
  });
});

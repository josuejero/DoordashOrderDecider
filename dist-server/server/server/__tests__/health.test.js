// server/__tests__/health.test.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
describe("health routes", () => {
    it("GET /health returns ok", async () => {
        const app = buildApp();
        const res = await app.inject({ method: "GET", url: "/health" });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: "ok" });
        await app.close();
    });
    it("GET /version returns a version string", async () => {
        const app = buildApp();
        const res = await app.inject({ method: "GET", url: "/version" });
        expect(res.statusCode).toBe(200);
        expect(typeof res.json().version).toBe("string");
        await app.close();
    });
});

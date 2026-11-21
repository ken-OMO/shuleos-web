import assert from "node:assert/strict";
import test from "node:test";
import { AxiosError } from "axios";
import { apiClient } from "../../src/services/api/api-client";
import { useAuthStore } from "../../src/store/auth-store";
import type { AuthChallenge } from "../../src/types/auth";

const challenge: AuthChallenge = { kind: "activation", scope: "school", schoolId: "alpha", challengeId: "challenge-alpha", secret: "synthetic", expiresAt: Date.now() + 60_000 };

test("school email login sends a school code while platform login never sends one", async () => {
  const adapter = apiClient.defaults.adapter; useAuthStore.getState().cancelChallenge();
  try {
    apiClient.defaults.adapter = async config => {
      const body = JSON.parse(config.data);
      if (config.url === "/auth/login") assert.deepEqual(body, { username: "same@example.test", password: "synthetic", school_code: "ALPHA" });
      else assert.deepEqual(body, { identifier: "owner@example.test", password: "synthetic" });
      return { config, status: 202, statusText: "Accepted", headers: {}, data: { success: true, data: { authenticated: false, challenge_id: "challenge", challenge_token: "synthetic", expires_in: 600 } } };
    };
    await useAuthStore.getState().login({ username: "same@example.test", password: "synthetic", school_code: "ALPHA" });
    await useAuthStore.getState().login({ username: "owner@example.test", password: "synthetic", school_code: "MUST-NOT-SEND" }, "platform");
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("activation cannot replace a school-bound challenge with another school", async () => {
  const adapter = apiClient.defaults.adapter; useAuthStore.getState().cancelChallenge(); useAuthStore.setState({ challenge });
  try {
    apiClient.defaults.adapter = async config => ({ config, status: 202, statusText: "Accepted", headers: {}, data: { success: true, data: { authenticated: false, school_id: "beta", challenge_id: "challenge-beta", activation_token: "synthetic-beta", expires_in: 600 } } });
    await assert.rejects(useAuthStore.getState().continueChallenge({}), /school mismatch/);
    assert.equal(useAuthStore.getState().status, "guest"); assert.equal(useAuthStore.getState().challenge?.schoolId, "alpha");
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

test("failed login stays on a mounted guest form so its error can be shown", async () => {
  const adapter = apiClient.defaults.adapter; useAuthStore.getState().cancelChallenge();
  try {
    apiClient.defaults.adapter = async config => { assert.equal(useAuthStore.getState().status, "guest"); throw new AxiosError("Blocked", "ERR_BAD_REQUEST", config, undefined, { config, status: 429, statusText: "Too many attempts", headers: {}, data: { message: "Too many attempts" } }); };
    await assert.rejects(useAuthStore.getState().login({ username: "same@example.test", password: "synthetic", school_code: "ALPHA" }));
    assert.equal(useAuthStore.getState().status, "guest");
  } finally { apiClient.defaults.adapter = adapter; useAuthStore.getState().cancelChallenge(); }
});

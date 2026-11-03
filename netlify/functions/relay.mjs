/* دالة Netlify: نقطة /api/relay للوضع المدرسي (تخزين الغرف في Netlify Blobs). */
import { getStore } from "@netlify/blobs";
import core from "../relay-core.cjs";

const store = getStore({ name: "bg-relay", consistency: "strong" });

const adapter = {
  async get(key) {
    return store.get(key, { type: "json" });
  },
  async set(key, value) {
    await store.setJSON(key, value);
  },
  async del(key) {
    await store.delete(key);
  },
  async list(prefix) {
    const out = await store.list({ prefix });
    return (out.blobs || []).map((blob) => blob.key).sort();
  },
};

const relay = core.createRelay(adapter);

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  /* يسمح للمواقع الأخرى (مثل github.io) باستخدام هذه الخدمة */
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: true, service: "bg-relay" }), { headers });
  }
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "bad-json" }), { status: 400, headers });
  }
  const out = await relay.handle(body);
  return new Response(JSON.stringify(out), { headers });
};

export const config = { path: "/api/relay" };

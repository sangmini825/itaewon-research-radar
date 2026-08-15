import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Itaewon Research Radar", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/i);
  assert.match(html, /<title>ITAEWON RADAR<\/title>/i);
  assert.match(html, /ITAEWON RADAR/);
  assert.match(html, />자료</);
  assert.match(html, />출처</);
  assert.match(html, /더 보기/);
  assert.match(html, /시민대책회의 홈페이지 업데이트|희생자 추가 인정/);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("removes the temporary starter preview", async () => {
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

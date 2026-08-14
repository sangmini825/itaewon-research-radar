import RadarClient, { type Feed } from "./RadarClient";

const FEED_URL =
  "https://dbcgtfiohkfsvxxnximj.supabase.co/functions/v1/itaewon-radar-feed?limit=200";

export default async function Home() {
  let feed: Feed | null = null;
  let error = "";

  try {
    const response = await fetch(FEED_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`레이더 데이터 요청 실패 (${response.status})`);
    feed = await response.json() as Feed;
  } catch (reason) {
    console.error(reason);
    error = "레이더 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
  }

  return <RadarClient feed={feed} error={error} />;
}

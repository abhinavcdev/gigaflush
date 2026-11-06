// One Open Graph PNG per page: /og/index.png, /og/clean/node-modules.png, …
import type { APIContext } from "astro";
import { cards, renderCard, type Card } from "../../lib/og";

export async function getStaticPaths() {
  return (await cards()).map((card) => ({ params: { key: card.key }, props: { card } }));
}

export async function GET({ props }: APIContext) {
  const png = await renderCard(props.card as Card);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}

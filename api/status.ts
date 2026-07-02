export const config = {
  runtime: "experimental-edge",
};

const handler = (_req: Request) => new Response("ok");
// eslint-disable-next-line import-x/no-default-export -- Vercel edge functions must default-export the handler
export default handler;

export const config = {
  runtime: "experimental-edge",
};

const handler = (_req: Request) => new Response("ok");
export default handler;

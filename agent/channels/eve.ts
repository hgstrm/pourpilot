import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc, type AuthFn } from "eve/channels/auth";

const previewBrowserAuth = (): AuthFn<Request> => {
  const anonymous = none<Request>();

  return (request) =>
    process.env.VERCEL_ENV === "preview" ? anonymous(request) : null;
};

export default eveChannel({
  auth: [
    vercelOidc(),
    localDev(),
    previewBrowserAuth(),
  ],
});

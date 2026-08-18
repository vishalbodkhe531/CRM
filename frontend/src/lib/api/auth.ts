export { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

export type AuthChannelMessage =
  | { type: "REFRESH_STARTED" }
  | { type: "REFRESH_SUCCESS"; payload: { accessToken: string } }
  | { type: "REFRESH_FAILURE"; payload: { error: string } }
  | { type: "LOGOUT" };

export const authChannel = new BroadcastChannel("auth_sync");

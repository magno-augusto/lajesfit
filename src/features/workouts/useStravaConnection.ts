import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { disconnectStrava, getStravaAuthorizationUrl, getStravaConnection } from "./strava-api";

export const STRAVA_CONNECTION_EVENT = "lajesfit-strava-connection-changed";

export function useStravaConnection() {
  // null = ainda carregando; evita mostrar o botao de conectar antes de saber o estado
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    getStravaConnection()
      .then((connection) => setConnected(connection.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(STRAVA_CONNECTION_EVENT, refresh);
    return () => window.removeEventListener(STRAVA_CONNECTION_EVENT, refresh);
  }, [refresh]);

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem("lajesfit-strava-oauth-state", state);
      const redirectUri = `${window.location.origin}/strava/callback`;
      const { url } = await getStravaAuthorizationUrl({ data: { redirectUri, state } });
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel iniciar o Strava");
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      await disconnectStrava();
      setConnected(false);
      window.dispatchEvent(new Event(STRAVA_CONNECTION_EVENT));
      toast.success("Conta do Strava desconectada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel desconectar o Strava");
    } finally {
      setBusy(false);
    }
  }, []);

  return { connected, busy, connect, disconnect };
}

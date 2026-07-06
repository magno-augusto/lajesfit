import { cn } from "@/lib/utils";
import btnConnectWithStrava from "@/assets/strava/btn_strava_connect_with_orange.svg";

// Botao oficial exigido pelas diretrizes de marca do Strava
// (https://developers.strava.com/guidelines): asset original, altura minima 48px
export function ConnectWithStravaButton({
  onClick,
  disabled = false,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Connect with Strava"
      className={cn(
        "inline-flex items-center justify-center transition-opacity disabled:opacity-60",
        className,
      )}
    >
      <img src={btnConnectWithStrava} alt="Connect with Strava" className="h-12 w-auto" />
    </button>
  );
}

import { Button } from "@/modules/ui";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center content-center gap-5 p-8 text-center"
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-[.13em] text-muted">
        404 / Not found
      </p>
      <h1 className="m-0 max-w-[650px] text-[clamp(40px,7vw,80px)] font-bold tracking-[-.06em]">
        This review frame does not exist.
      </h1>
      <Button href="/app" variant="primary">
        Return to app
      </Button>
    </main>
  );
}

import { Link } from "react-router";
import { Brand, Seal } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-5 py-5">
        <Brand />
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-[520px] border border-border bg-card p-8 text-center">
          <div className="flex justify-center">
            <Seal>Off the record</Seal>
          </div>
          <p className="display mt-5 text-6xl leading-none">404</p>
          <h1 className="display mt-4 text-3xl leading-tight">
            This page was never announced.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Either it never existed, or it stayed in the room.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Back to the front</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

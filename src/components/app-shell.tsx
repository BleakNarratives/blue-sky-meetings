import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Brand, Seal } from "@/components/brand";
import { NewRoomDialog } from "@/components/room-forms";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { bandFor, BAND_VAR } from "@/convex/runscore";
import { Link, useLocation, useNavigate } from "react-router";
import { LayoutGrid, LogOut, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type RoomSummary = {
  _id: string;
  title: string;
  ideaCount: number;
  scoredCount: number;
  topScore: number | null;
};

function RoomRow({
  room,
  active,
  onNavigate,
}: {
  room: RoomSummary;
  active: boolean;
  onNavigate?: () => void;
}) {
  const band = room.topScore === null ? null : bandFor(room.topScore);

  return (
    <Link
      to={`/room/${room._id}`}
      onClick={onNavigate}
      className={cn(
        "group flex flex-col gap-1.5 border-l-2 px-3 py-2.5 transition-colors",
        active
          ? "border-foreground bg-sidebar-accent"
          : "border-transparent hover:border-border hover:bg-sidebar-accent/50",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "truncate text-[0.8125rem] leading-snug",
            active ? "font-medium text-foreground" : "text-sidebar-foreground/85",
          )}
        >
          {room.title}
        </span>
        {room.topScore !== null && band && (
          <span
            className="num shrink-0 text-[0.625rem]"
            style={{ color: BAND_VAR[band.key] }}
          >
            {room.topScore.toFixed(0)}
          </span>
        )}
      </span>
      <span className="label-sm text-muted-foreground">
        {room.ideaCount} {room.ideaCount === 1 ? "idea" : "ideas"} ·{" "}
        {room.scoredCount} scored
      </span>
    </Link>
  );
}

function SidebarBody({
  rooms,
  activeRoomId,
  onNewRoom,
  onSignOut,
  email,
  name,
  onNavigate,
}: {
  rooms: RoomSummary[] | undefined;
  activeRoomId?: string;
  onNewRoom: () => void;
  onSignOut: () => void;
  email?: string | null;
  name?: string | null;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const displayName = name || email?.split("@")[0] || "Guest seat";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Brand />
        <p className="label-sm mt-3 text-muted-foreground">
          Sealed ideation · v1
        </p>
      </div>

      <div className="px-3 py-4">
        <Button className="w-full justify-start gap-2" onClick={onNewRoom}>
          <Plus className="size-3.5" />
          Open a room
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className={cn(
            "mb-3 flex items-center gap-2 border-l-2 px-3 py-2 transition-colors",
            location.pathname === "/dashboard"
              ? "border-foreground bg-sidebar-accent text-foreground"
              : "border-transparent text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
          )}
        >
          <LayoutGrid className="size-3.5" />
          <span className="label">The board</span>
        </Link>

        <div className="mb-1 flex items-center justify-between px-3">
          <span className="label text-muted-foreground">Rooms</span>
          <span className="num text-[0.625rem] text-muted-foreground">
            {rooms?.length ?? 0}
          </span>
        </div>

        {rooms === undefined ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Reading…</p>
        ) : rooms.length === 0 ? (
          <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">
            No rooms yet. The first one is free.
          </p>
        ) : (
          <div className="flex flex-col">
            {rooms.map((room) => (
              <RoomRow
                key={room._id}
                room={room}
                active={room._id === activeRoomId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="mb-3 px-3">
          <Seal className="scale-90 origin-left">Sealed</Seal>
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center border border-sidebar-border bg-background font-mono text-[0.7rem]">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.78rem] leading-tight">
              {displayName}
            </span>
            <span className="block truncate text-[0.65rem] text-muted-foreground">
              {email ?? "temporary seat"}
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const rooms = useQuery(api.rooms.list);
  const navigate = useNavigate();
  const location = useLocation();
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const activeRoomId = location.pathname.startsWith("/room/")
    ? location.pathname.split("/")[2]
    : undefined;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const shared = {
    rooms: rooms as RoomSummary[] | undefined,
    activeRoomId,
    onNewRoom: () => {
      setNewRoomOpen(true);
      setNavOpen(false);
    },
    onSignOut: handleSignOut,
    email: user?.email,
    name: user?.name,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 border-r border-border bg-sidebar lg:block">
          <SidebarBody {...shared} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur lg:hidden">
            <Brand />
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Open navigation"
                onClick={() => setNavOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
            </div>
          </div>

          <main className="px-5 pb-24 pt-8 sm:px-8 lg:px-12 lg:pb-16 lg:pt-12">
            {children}
          </main>
        </div>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="w-[88%] max-w-[300px] gap-0 border-r border-sidebar-border bg-sidebar p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Rooms and account
          </SheetDescription>
          <SidebarBody {...shared} onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <NewRoomDialog
        open={newRoomOpen}
        onOpenChange={setNewRoomOpen}
        onCreated={(roomId) => navigate(`/room/${roomId}`)}
      />
    </div>
  );
}

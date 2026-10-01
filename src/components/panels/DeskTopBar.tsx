import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Bell,
  ChevronLeft,
  LogOut,
  Mail,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import { useDeskTheme } from "@/lib/deskTheme";

export type DeskFeedItem = {
  id: string;
  title: string;
  body?: string;
  /** Timestamp used for the "read everything before this" marker. */
  at?: number;
  icon?: ReactNode;
  onClick?: () => void;
  actionLabel?: string;
};

type ReadState = { readAllAt: number; ids: string[] };

function readStateKey(scope: string) {
  return `genova-desk-read:${scope}`;
}

function loadReadState(scope: string): ReadState {
  try {
    const raw = localStorage.getItem(readStateKey(scope));
    if (raw) {
      const parsed = JSON.parse(raw) as ReadState;
      return { readAllAt: parsed.readAllAt ?? 0, ids: Array.isArray(parsed.ids) ? parsed.ids : [] };
    }
  } catch {
    // storage unavailable — treat everything as unread
  }
  return { readAllAt: 0, ids: [] };
}

function saveReadState(scope: string, next: ReadState) {
  try {
    localStorage.setItem(readStateKey(scope), JSON.stringify(next));
  } catch {
    // storage unavailable — read state stays session-only
  }
}

function FeedList({
  items,
  read,
  onMarkAll,
  onOpen,
  emptyLabel,
  emptyHint,
}: {
  items: DeskFeedItem[];
  read: ReadState;
  onMarkAll: () => void;
  onOpen: () => void;
  emptyLabel: string;
  emptyHint: string;
}) {
  const unread = items.filter(
    (i) => !read.ids.includes(i.id) && (i.at ?? 0) > read.readAllAt,
  ).length;

  return (
    <div className="w-[320px] max-w-[calc(100vw-2rem)]" dir="rtl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[13px] font-bold">
          {unread > 0 ? `${faNum(unread)} مورد خوانده‌نشده` : "همه خوانده شده"}
        </span>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            علامت‌زدن همه به‌عنوان خوانده‌شده
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <Bell className="mx-auto size-6 text-muted-foreground/40" />
          <p className="mt-3 text-[13px] font-semibold">{emptyLabel}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{emptyHint}</p>
        </div>
      ) : (
        <div className="admin-scroll max-h-80 overflow-y-auto">
          {items.map((item) => {
            const isRead = read.ids.includes(item.id) || (item.at ?? 0) <= read.readAllAt;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  onOpen();
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 border-b border-border/60 px-4 py-3 text-right transition-colors last:border-0 hover:bg-muted/60",
                  !isRead && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                    isRead ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary",
                  )}
                >
                  {item.icon ?? <Bell className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate text-[12.5px]",
                        isRead ? "font-medium text-muted-foreground" : "font-bold",
                      )}
                    >
                      {item.title}
                    </span>
                    {!isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </span>
                  {item.body && (
                    <span className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                      {item.body}
                    </span>
                  )}
                  <span className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                    {item.at ? (
                      <span>{new Date(item.at).toLocaleDateString("fa-IR")}</span>
                    ) : null}
                    {item.actionLabel && (
                      <span className="font-semibold text-primary">{item.actionLabel}</span>
                    )}
                  </span>
                </span>
                <ChevronLeft className="mt-1 size-3.5 shrink-0 text-muted-foreground/50" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر کل",
  site_admin: "مدیر سایت",
  content_manager: "مدیر محتوا",
  mentor: "منتور",
  instructor: "مدرس",
  support: "پشتیبانی",
};

export type DeskTopBarProps = {
  /** Unique per desk, used to keep read markers separate. */
  scope: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  notifications: DeskFeedItem[];
  messages: DeskFeedItem[];
  userName: string;
  userRole?: string;
  onToggleSidebar?: () => void;
  /** Extra links inside the profile menu (e.g. admin console). */
  extraProfileLinks?: { label: string; to: string; icon?: ReactNode }[];
  profileHref?: string;
  title?: string;
};

/**
 * The dark header strip every desk shares: search, notifications, inbox and the
 * profile menu (which also owns the desk light/dark switch).
 */
export default function DeskTopBar({
  scope,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  notifications,
  messages,
  userName,
  userRole,
  onToggleSidebar,
  extraProfileLinks,
  profileHref = "/dashboard",
  title,
}: DeskTopBarProps) {
  const [read, setRead] = useState<ReadState>(() => loadReadState(scope));
  const { theme, setTheme } = useDeskTheme(scope);

  const markAll = useCallback(() => {
    const next: ReadState = {
      readAllAt: Math.max(Date.now(), read.readAllAt),
      ids: [...notifications, ...messages].map((i) => i.id),
    };
    setRead(next);
    saveReadState(scope, next);
  }, [messages, notifications, read.readAllAt, scope]);

  const unreadCount = useMemo(
    () =>
      [...notifications, ...messages].filter(
        (i) => !read.ids.includes(i.id) && (i.at ?? 0) > read.readAllAt,
      ).length,
    [messages, notifications, read],
  );

  const roleLabel = userRole ? (ROLE_LABELS[userRole] ?? userRole) : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 backdrop-blur sm:gap-3 sm:px-5">
      {onToggleSidebar && (
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-xl lg:hidden"
          onClick={onToggleSidebar}
          title="منو"
        >
          <Menu className="size-4" />
        </Button>
      )}

      {title && (
        <span className="hidden shrink-0 text-[13px] font-bold lg:block">{title}</span>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative size-9 rounded-xl" title="پیام‌ها">
              <Mail className="size-4" />
              {messages.filter(
                (m) => !read.ids.includes(m.id) && (m.at ?? 0) > read.readAllAt,
              ).length > 0 && (
                <span className="absolute -left-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {faNum(messages.length)}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <FeedList
              items={messages}
              read={read}
              onMarkAll={markAll}
              onOpen={() => undefined}
              emptyLabel="پیامی ندارید"
              emptyHint="اعلان‌های مدیریت سایت اینجا نمایش داده می‌شود."
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative size-9 rounded-xl"
              title="اعلان‌ها"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -left-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold leading-4 text-white">
                  {unreadCount > 9 ? "+۹" : faNum(unreadCount)}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <FeedList
              items={notifications}
              read={read}
              onMarkAll={markAll}
              onOpen={() => undefined}
              emptyLabel="اعلانی ندارید"
              emptyHint="تغییرات کارهای شما اینجا اعلام می‌شود."
            />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl border border-border bg-background py-1.5 pl-3 pr-1.5 transition-colors hover:bg-muted">
              <span className="text-right leading-tight">
                <span className="block max-w-[120px] truncate text-[12px] font-semibold">
                  {userName}
                </span>
                {roleLabel && (
                  <span className="block text-[10px] text-muted-foreground">{roleLabel}</span>
                )}
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                {(userName || "ن")[0].toUpperCase()}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">
                {(userName || "ن")[0].toUpperCase()}
              </span>
              <span className="leading-tight">
                <span className="block text-[12.5px] font-bold">{userName}</span>
                {roleLabel && (
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {roleLabel}
                  </span>
                )}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={profileHref}>
                <User className="size-4" />
                پروفایل من
              </Link>
            </DropdownMenuItem>
            {extraProfileLinks?.map((link) => (
              <DropdownMenuItem key={link.to} asChild>
                <Link to={link.to}>
                  {link.icon ?? <Settings className="size-4" />}
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                تم {theme === "dark" ? "تاریک" : "روشن"}
              </DropdownMenuSubTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setTheme("light")}>
                  <Sun className="size-4" />
                  روشن
                  {theme === "light" && <span className="mr-auto text-[10px]">فعال</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("dark")}>
                  <Moon className="size-4" />
                  تاریک
                  {theme === "dark" && <span className="mr-auto text-[10px]">فعال</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
              <Link to="/">
                <LogOut className="size-4" />
                خروج از حساب
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
// ── Site Studio: extensible block registry ────────────────────────────────
// To add a new block type in the future: append a BLOCKS entry. The studio
// UI (palette, inspector, canvas) and the public renderer pick it up
// automatically — no architecture changes needed.

import type { LucideIcon } from "lucide-react";
import {
  Heading1,
  Image as ImageIcon,
  LayoutTemplate,
  Link2,
  MousePointerClick,
  Square,
  Type,
  Images,
  Play,
  BarChart3,
  Megaphone,
} from "lucide-react";

// Which studio permission guards a given field/control.
export type PermKind =
  | "content"
  | "media"
  | "links"
  | "style"
  | "layout"
  | "components"
  | "theme";

export const PERM_KEY: Record<PermKind, string> & Record<string, string> = {
  content: "content.edit",
  media: "media.edit",
  links: "links.edit",
  style: "style.edit",
  layout: "layout.edit",
  components: "components.manage",
  theme: "theme.manage",
  "content.edit": "content.edit",
  "media.edit": "media.edit",
  "links.edit": "links.edit",
  "style.edit": "style.edit",
  "layout.edit": "layout.edit",
  "components.manage": "components.manage",
  "theme.manage": "theme.manage",
  "pages.manage": "pages.manage",
  "navigation.manage": "navigation.manage",
  preview: "preview",
  publish: "publish",
};

export const PERM_LABEL: Record<string, string> = {
  "content.edit": "ویرایش محتوا",
  "media.edit": "ویرایش رسانه",
  "links.edit": "ویرایش لینک‌ها",
  "style.edit": "ویرایش استایل",
  "layout.edit": "چیدمان و ترتیب",
  "components.manage": "مدیریت کامپوننت‌ها",
  "theme.manage": "مدیریت تم",
  "pages.manage": "مدیریت صفحات",
  "navigation.manage": "مدیریت منوها",
  preview: "پیش‌نمایش",
  publish: "انتشار",
};

// ── Element style model (applies to every block) ──────────────────────────
export type ElementStyle = {
  textColor?: string;
  backgroundColor?: string;
  align?: "start" | "center" | "end";
  fontSize?: number; // px
  fontWeight?: number; // 300..900
  paddingY?: number; // px, vertical spacing
  radius?: number; // px
  shadow?: "none" | "sm" | "md" | "lg";
  maxWidth?: number; // px, content width cap
};

// ── Page theme model (theme.manage) ───────────────────────────────────────
export type SiteTheme = {
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  baseFontSize?: number;
  radius?: number;
  sectionSpacing?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  maxWidth?: number;
};

export const THEME_FONTS = [
  { value: "Vazirmatn", label: "وزیرمتن (پیش‌فرض)" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "Segoe UI", label: "Segoe UI" },
  { value: "system-ui", label: "سیستمی" },
];

export const DEFAULT_THEME: SiteTheme = {
  fontFamily: "Vazirmatn",
  baseFontSize: 16,
  radius: 14,
  sectionSpacing: 24,
  shadow: "none",
};

// ── Field definitions ─────────────────────────────────────────────────────
export type FieldDef =
  | { key: string; label: string; type: "text" | "textarea"; perm: PermKind; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "image" | "video"; perm: PermKind; hint?: string }
  | { key: string; label: string; type: "link"; perm: PermKind; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "boolean"; perm: PermKind; hint?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; perm: PermKind; hint?: string }
  | { key: string; label: string; type: "color"; perm: PermKind; hint?: string }
  | { key: string; label: string; type: "number"; perm: PermKind; min?: number; max?: number; hint?: string };

// ── Block definition ──────────────────────────────────────────────────────
export type BlockDef = {
  type: string;
  label: string;
  icon: LucideIcon;
  description: string;
  defaultProps: Record<string, unknown>;
  fields: FieldDef[];
};

const FONT_WEIGHTS = [
  { value: "400", label: "معمولی" },
  { value: "500", label: "متوسط" },
  { value: "700", label: "ضخیم" },
  { value: "900", label: "خیلی ضخیم" },
];

export const BLOCKS: BlockDef[] = [
  {
    type: "hero",
    label: "هیرو / بنر اصلی",
    icon: LayoutTemplate,
    description: "بخش معرفی بالای صفحه با عنوان، توضیح، دکمه و تصویر",
    defaultProps: {
      badge: "پلتفرم تخصصی علوم زیستی",
      title: "یادگیری عمیق علوم زیستی",
      subtitle: "دوره، جزوه، فلش‌کارت و آزمون — مسیر یادگیری از ترم اول تا امتحان.",
      primaryText: "مشاهده دوره‌ها",
      primaryLink: "/courses",
      secondaryText: "آزمون تعیین سطح",
      secondaryLink: "/tests",
      image: "",
    },
    fields: [
      { key: "badge", label: "برچسب بالای عنوان", type: "text", perm: "content" },
      { key: "title", label: "عنوان", type: "text", perm: "content" },
      { key: "subtitle", label: "توضیح", type: "textarea", perm: "content" },
      { key: "primaryText", label: "متن دکمهٔ اصلی", type: "text", perm: "content" },
      { key: "primaryLink", label: "لینک دکمهٔ اصلی", type: "link", perm: "links", placeholder: "/courses" },
      { key: "secondaryText", label: "متن دکمهٔ دوم", type: "text", perm: "content" },
      { key: "secondaryLink", label: "لینک دکمهٔ دوم", type: "link", perm: "links", placeholder: "/tests" },
      { key: "image", label: "تصویر هیرو", type: "image", perm: "media", hint: "اختیاری — از کتابخانه رسانه" },
    ],
  },
  {
    type: "heading",
    label: "تیتر بخش",
    icon: Heading1,
    description: "عنوان یک بخش با تراز و رنگ قابل تنظیم",
    defaultProps: { text: "عنوان بخش" },
    fields: [{ key: "text", label: "متن تیتر", type: "text", perm: "content" }],
  },
  {
    type: "text",
    label: "پاراگراف",
    icon: Type,
    description: "متن آزاد با پشتیبانی چند خطی",
    defaultProps: { text: "متن پاراگراف را اینجا بنویسید…" },
    fields: [{ key: "text", label: "متن", type: "textarea", perm: "content" }],
  },
  {
    type: "image",
    label: "تصویر",
    icon: ImageIcon,
    description: "تصویر با کپشن اختیاری",
    defaultProps: { src: "", alt: "", caption: "" },
    fields: [
      { key: "src", label: "تصویر", type: "image", perm: "media" },
      { key: "alt", label: "متن جایگزین", type: "text", perm: "content" },
      { key: "caption", label: "کپشن", type: "text", perm: "content" },
    ],
  },
  {
    type: "button",
    label: "دکمه",
    icon: MousePointerClick,
    description: "دکمه با لینک دلخواه",
    defaultProps: { text: "دکمه", href: "/", variant: "primary" },
    fields: [
      { key: "text", label: "متن دکمه", type: "text", perm: "content" },
      { key: "href", label: "لینک", type: "link", perm: "links", placeholder: "/courses یا https://…" },
      {
        key: "variant",
        label: "سبک دکمه",
        type: "select",
        perm: "style",
        options: [
          { value: "primary", label: "اصلی" },
          { value: "outline", label: "خطی" },
          { value: "ghost", label: "شفاف" },
        ],
      },
    ],
  },
  {
    type: "card",
    label: "کارت ویژگی",
    icon: Square,
    description: "کارت با آیکن، عنوان، توضیح و لینک",
    defaultProps: { icon: "🧬", title: "عنوان کارت", text: "توضیح کوتاه کارت…", link: "" },
    fields: [
      { key: "icon", label: "آیکن / ایموجی", type: "text", perm: "content" },
      { key: "title", label: "عنوان", type: "text", perm: "content" },
      { key: "text", label: "توضیح", type: "textarea", perm: "content" },
      { key: "link", label: "لینک", type: "link", perm: "links", placeholder: "اختیاری" },
    ],
  },
  {
    type: "gallery",
    label: "گالری تصاویر",
    icon: Images,
    description: "چند تصویر کنار هم — هر خط یک آدرس تصویر",
    defaultProps: { images: "", columns: 3 },
    fields: [
      { key: "images", label: "آدرس تصاویر (هر خط یکی)", type: "textarea", perm: "media" },
      { key: "columns", label: "تعداد ستون", type: "number", perm: "style", min: 1, max: 6 },
    ],
  },
  {
    type: "video",
    label: "ویدئو",
    icon: Play,
    description: "ویدئو MP4 یا embed یوتیوب/آپارات",
    defaultProps: { src: "", poster: "" },
    fields: [
      { key: "src", label: "ویدئو (MP4 یا embed)", type: "video", perm: "media" },
      { key: "poster", label: "تصویر کاور", type: "image", perm: "media" },
    ],
  },
  {
    type: "stats",
    label: "آمار / اعداد",
    icon: BarChart3,
    description: "ردیف اعداد — هر خط: عدد | برچسب",
    defaultProps: { items: "+۴ هزار | دانشجوی همراه\n+۸ دوره | تخصصی علوم زیستی" },
    fields: [{ key: "items", label: "موارد (عدد | برچسب)", type: "textarea", perm: "content" }],
  },
  {
    type: "cta",
    label: "فراخوان اقدام",
    icon: Megaphone,
    description: "بانر دعوت به اقدام با دکمه",
    defaultProps: { title: "همین حالا شروع کن", text: "به هزاران دانشجوی علوم زیستی بپیوند.", buttonText: "شروع", buttonLink: "/auth" },
    fields: [
      { key: "title", label: "عنوان", type: "text", perm: "content" },
      { key: "text", label: "توضیح", type: "textarea", perm: "content" },
      { key: "buttonText", label: "متن دکمه", type: "text", perm: "content" },
      { key: "buttonLink", label: "لینک دکمه", type: "link", perm: "links" },
    ],
  },
  {
    type: "link",
    label: "لینک متنی",
    icon: Link2,
    description: "لینک ساده با متن دلخواه",
    defaultProps: { text: "مشاهده بیشتر", href: "/" },
    fields: [
      { key: "text", label: "متن", type: "text", perm: "content" },
      { key: "href", label: "لینک", type: "link", perm: "links" },
    ],
  },
];

export const blockDef = (type: string): BlockDef | undefined =>
  BLOCKS.find((b) => b.type === type);

// Controls shown for every element regardless of type (style.edit required).
export const COMMON_STYLE_FIELDS: FieldDef[] = [
  { key: "textColor", label: "رنگ متن", type: "color", perm: "style" },
  { key: "backgroundColor", label: "رنگ پس‌زمینه", type: "color", perm: "style" },
  {
    key: "align",
    label: "تراز",
    type: "select",
    perm: "style",
    options: [
      { value: "start", label: "راست (شروع)" },
      { value: "center", label: "وسط" },
      { value: "end", label: "چپ (پایان)" },
    ],
  },
  {
    key: "fontWeight",
    label: "وزن فونت",
    type: "select",
    perm: "style",
    options: FONT_WEIGHTS,
  },
  { key: "fontSize", label: "اندازه فونت (px)", type: "number", perm: "style", min: 10, max: 96 },
  { key: "paddingY", label: "فاصله عمودی (px)", type: "number", perm: "style", min: 0, max: 200 },
  { key: "radius", label: "گردی گوشه‌ها (px)", type: "number", perm: "style", min: 0, max: 64 },
  {
    key: "shadow",
    label: "سایه",
    type: "select",
    perm: "style",
    options: [
      { value: "none", label: "بدون سایه" },
      { value: "sm", label: "کم" },
      { value: "md", label: "متوسط" },
      { value: "lg", label: "زیاد" },
    ],
  },
  { key: "maxWidth", label: "حداکثر عرض (px)", type: "number", perm: "style", min: 200, max: 1400 },
];

// ── Style → CSS ───────────────────────────────────────────────────────────
const SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,.12)",
  md: "0 4px 14px rgba(0,0,0,.14)",
  lg: "0 12px 34px rgba(0,0,0,.18)",
};

export function styleToCss(style: ElementStyle | undefined, theme?: SiteTheme | null): React.CSSProperties {
  const s = style ?? {};
  const t = theme ?? {};
  const css: React.CSSProperties = {};
  const color = s.textColor ?? t.textColor;
  if (color) css.color = color;
  if (s.backgroundColor) css.backgroundColor = s.backgroundColor;
  if (s.align) css.textAlign = s.align === "start" ? "right" : s.align === "end" ? "left" : "center";
  const fontSize = s.fontSize ?? t.baseFontSize;
  if (fontSize) css.fontSize = `${fontSize}px`;
  const weight = s.fontWeight;
  if (weight) css.fontWeight = weight;
  if (s.paddingY !== undefined) {
    css.paddingTop = `${s.paddingY}px`;
    css.paddingBottom = `${s.paddingY}px`;
  }
  css.borderRadius = `${s.radius ?? t.radius ?? 14}px`;
  css.boxShadow = SHADOWS[s.shadow ?? t.shadow ?? "none"];
  const maxW = s.maxWidth ?? t.maxWidth;
  if (maxW) css.maxWidth = `${maxW}px`;
  return css;
}

export function themeToWrapperCss(theme: SiteTheme | null | undefined): React.CSSProperties {
  const t = theme ?? {};
  const css: React.CSSProperties = {};
  if (t.fontFamily) css.fontFamily = `"${t.fontFamily}", "Vazirmatn", sans-serif`;
  if (t.textColor) css.color = t.textColor;
  if (t.backgroundColor) css.backgroundColor = t.backgroundColor;
  if (t.baseFontSize) css.fontSize = `${t.baseFontSize}px`;
  return css;
}

// Element data as consumed by renderer/canvas.
export type StudioElement = {
  id: string;
  type: string;
  label?: string;
  props: Record<string, unknown>;
  style: ElementStyle;
};

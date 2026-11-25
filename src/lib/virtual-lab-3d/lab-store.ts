import { create } from "zustand";

export interface LabManagerState {
  yaw: number;
  pitch: number;
  locked: boolean;
  hoveredId: string | null;
  setLocked: (locked: boolean) => void;
  setHoveredId: (id: string | null) => void;
}

export const useLabStore = create<LabManagerState>((set, get) => ({
  yaw: 0,
  pitch: 0,
  locked: false,
  hoveredId: null,

  setLocked: (locked) => set({ locked }),

  setHoveredId: (id) => set({ hoveredId: id }),
}));

export type LabEquipment = {
  id: string;
  label: string;
  description: string;
  position: [number, number, number];
  scale?: number;
};

export const LAB_EQUIPMENT: LabEquipment[] = [
  {
    id: "pipette",
    label: "پیکتیو پیکering",
    description:
      "پیکتیو pipette یک ابزار پیکering است که برای انتقال دقیق حجم‌های کوچک مایعات به کار می‌رود. در آزمایشگاه‌های زیست‌شناسی مولکولی، پیکتیو pipette‌ها با دقت میکروولیتری، شSamples، پرایمرها و رئاکتants راределя می‌کنند. دقت آن‌ها مستقیماً بر结果的 ح애드 assays effects.",
    position: [3.4, 0.82, -2.2],
    scale: 1.15,
  },
  {
    id: "centrifuge",
    label: "سانتریفیوژ میکرو",
    description:
      "میکروسانتریفیوژ برای جداسازی اجزای نمونه بر پایه چگالی با چرخش‌های بالا (کوئلی‌ها، DNA/RNA، پروتئین‌ها) استفاده می‌شود. سرعت و زمان چرخش بسته به ساختار و اجزای درون‌یابد، و یک سانس‌محصول می‌تواند ریه‌های حاوی پلی‌نودها یا غشاهای آسیب‌دیده باشد.",
    position: [-3.6, 0.72, -2.0],
    scale: 0.95,
  },
  {
    id: "vortex",
    label: "ورتکس مایعات",
    description:
      "ورتکس‌موتر برای همگن‌سازی سریع مایعات و نمونه‌ها در لوله‌های میکروتوب استفاده می‌شود. در پروتکل‌های استخراج DNA، لایز آبشی، و ترکیب رئاکتانت‌های PCR، وورتکس کوتاه یک قدم استاندارد اولیه است. اغلب پیش از استخراج یا پس از رئاکتان‌سازی انجام می‌شود.",
    position: [3.2, 0.78, 1.6],
    scale: 1.05,
  },
  {
    id: "pcr",
    label: "اتراکای درون‌گرم‌کننده (PCR)",
    description:
      "دستگاه PCR (Polymerase Chain Reaction) برای تکثیر یک منطقه خاص از DNA در اندازه‌های میلی‌متری در یک رئاکتان به کار می‌رود. آن به‌طور مداوم بین دمای انزال، اتصال پرایمر و گسترش رئاکتان چرخش می‌کند تا تعداد کپی‌های هدف را در طی ده‌ها چرخه افزایش دهد. پایهٔ تقریب‌های ژنتیکی و تشخیصی است.",
    position: [-3.8, 0.78, 1.2],
    scale: 0.9,
  },
];

import { Arrow, Box, Callout, COLORS, Frame, Label } from "./primitives";

/** سطوح سازمان‌یابی زیستی — یک نردبان از مولکول تا موجود زنده. */
export function LifeLevels() {
  const levels = ["مولکول", "اندامک", "سلول", "بافت", "اندام", "دستگاه", "موجود زنده"];
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      {levels.map((level, index) => {
        const y = 148 - index * 20;
        const isCell = level === "سلول";
        return (
          <g key={level}>
            <rect
              x={64 + index * 3}
              y={y - 7}
              width={192 - index * 6}
              height={14}
              rx={7}
              fill={isCell ? COLORS.green : "#ffffff"}
              stroke={isCell ? COLORS.green : "#cbd5e1"}
              strokeWidth={0.8}
            />
            <Label x={160} y={y + 3} size={8} fill={isCell ? "#ffffff" : COLORS.charcoal}>
              {level}
            </Label>
          </g>
        );
      })}
      <Label x={278} y={18} size={7.5} fill={COLORS.slate}>
        هر پله ویژگی تازه می‌سازد
      </Label>
      <Arrow x1={160} y1={150} x2={160} y2={14} color={COLORS.green} width={0.8} dashed />
    </Frame>
  );
}

/** مسیر نور و اجزای میکروسکوپ نوری. */
export function Microscope() {
  return (
    <Frame viewBox="0 0 320 180">
      <rect x="0" y="0" width="320" height="180" fill="#f8fafc" />
      {/* base + arm */}
      <path d="M96 160 H196" stroke={COLORS.charcoal} strokeWidth={6} strokeLinecap="round" />
      <path d="M176 158 C200 130 200 96 178 72" stroke={COLORS.slate} strokeWidth={7} fill="none" strokeLinecap="round" />
      {/* tube */}
      <rect x="140" y="24" width="18" height="62" rx="4" fill="#e2e8f0" stroke={COLORS.slate} strokeWidth={0.8} />
      <rect x="132" y="16" width="34" height="12" rx="4" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={0.8} />
      <rect x="136" y="86" width="26" height="20" rx="3" fill="#ffffff" stroke={COLORS.slate} strokeWidth={0.8} />
      {/* stage + light */}
      <rect x="104" y="116" width="94" height="6" rx="2" fill="#cbd5e1" stroke={COLORS.slate} strokeWidth={0.6} />
      <circle cx="150" cy="146" r="9" fill={COLORS.amberSoft} stroke={COLORS.amber} strokeWidth={0.8} />
      {/* light path */}
      <Arrow x1={150} y1={136} x2={150} y2={108} color={COLORS.amber} width={1.6} />
      <Arrow x1={150} y1={100} x2={150} y2={34} color={COLORS.blue} width={1.6} />
      <Callout x={92} y={22} toX={136} toY={22} color={COLORS.blue}>
        عدسی چشمی
      </Callout>
      <Callout x={92} y={94} toX={134} toY={94} color={COLORS.blue}>
        عدسی شیئی
      </Callout>
      <Callout x={214} y={118} toX={196} toY={118} color={COLORS.slate}>
        صفحهٔ نمونه
      </Callout>
      <Callout x={214} y={146} toX={161} toY={146} color={COLORS.amber}>
        منبع نور
      </Callout>
      <Label x={240} y={46} size={8} fill={COLORS.green}>
        بزرگ‌نمایی کل =
      </Label>
      <Label x={240} y={60} size={8} fill={COLORS.green}>
        چشمی × شیئی
      </Label>
      <Label x={240} y={82} size={7.5} fill={COLORS.slate}>
        مثال: ۱۰ × ۴۰ = ۴۰۰×
      </Label>
    </Frame>
  );
}

/** پروکاریوت در برابر یوکاریوت. */
export function ProkaryoteEukaryote() {
  return (
    <Frame viewBox="0 0 320 180">
      <rect x="0" y="0" width="320" height="180" fill="#f8fafc" />
      {/* bacterium */}
      <ellipse cx="82" cy="92" rx="58" ry="34" fill={COLORS.greenSoft} stroke={COLORS.green} strokeWidth={1.4} />
      <ellipse cx="82" cy="92" rx="50" ry="27" fill="none" stroke="#6ee7b7" strokeWidth={2} />
      <path d="M78 88 q8 -12 16 -2 q-10 10 -18 6 q4 -10 16 -4" fill="none" stroke={COLORS.violet} strokeWidth={1.6} />
      <circle cx="54" cy="104" r="2.4" fill={COLORS.violet} />
      <circle cx="64" cy="106" r="2" fill={COLORS.violet} />
      <path d="M140 92 q14 -10 22 0 q-6 12 -22 4" fill="none" stroke={COLORS.charcoal} strokeWidth={1.6} />
      <Label x={82} y={54} size={9} fill={COLORS.green}>
        پروکاریوت
      </Label>
      <Callout x={82} y={130} toX={78} toY={92} color={COLORS.violet}>
        نوکلئوئید (بدون غشا)
      </Callout>
      <Callout x={166} y={126} toX={150} toY={96} color={COLORS.slate}>
        تاژک
      </Callout>
      <Callout x={26} y={62} toX={40} toY={72} color={COLORS.slate}>
        دیواره
      </Callout>
      <line x1="160" y1="26" x2="160" y2="158" stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
      {/* eukaryote */}
      <circle cx="244" cy="92" r="52" fill="#f0fdfa" stroke={COLORS.teal} strokeWidth={1.4} />
      <circle cx="238" cy="86" r="17" fill="#ccfbf1" stroke={COLORS.teal} strokeWidth={1.2} />
      <circle cx="238" cy="86" r="5" fill={COLORS.teal} opacity={0.5} />
      <ellipse cx="272" cy="118" rx="13" ry="6" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={0.9} />
      <path d="M206 112 q10 -6 16 2 q-8 8 -16 -2" fill="none" stroke={COLORS.amber} strokeWidth={1.4} />
      <path d="M212 70 q12 4 8 14 q-12 0 -8 -14" fill="none" stroke={COLORS.violet} strokeWidth={1.4} />
      <Label x={244} y={32} size={9} fill={COLORS.teal}>
        یوکاریوت
      </Label>
      <Callout x={196} y={62} toX={226} toY={78} color={COLORS.teal}>
        هسته
      </Callout>
      <Callout x={300} y={132} toX={282} toY={118} color={COLORS.rose}>
        میتوکندری
      </Callout>
      <Callout x={300} y={82} toX={250} toY={70} color={COLORS.violet}>
        ER
      </Callout>
      <Label x={160} y={172} size={7.5} fill={COLORS.slate}>
        مرز اصلی: هستهٔ غشادار و اندامک‌های غشادار
      </Label>
    </Frame>
  );
}

/** سلول گیاهی در برابر جانوری. */
export function PlantAnimal() {
  return (
    <Frame viewBox="0 0 320 180">
      <rect x="0" y="0" width="320" height="180" fill="#f8fafc" />
      {/* plant */}
      <rect x="18" y="34" width="128" height="108" rx="6" fill="#ecfdf5" stroke={COLORS.green} strokeWidth={3} />
      <rect x="24" y="40" width="116" height="96" rx="4" fill="#f0fdf4" stroke="#a7f3d0" strokeWidth={1} />
      <rect x="70" y="66" width="42" height="48" rx="10" fill="#bae6fd" stroke={COLORS.blue} strokeWidth={0.9} opacity={0.8} />
      {[0, 1, 2].map((index) => (
        <ellipse
          key={index}
          cx={40 + index * 22}
          cy={index % 2 === 0 ? 58 : 118}
          rx="9"
          ry="5"
          fill="#86efac"
          stroke={COLORS.green}
          strokeWidth={0.8}
        />
      ))}
      <circle cx="100" cy="60" r="6" fill="#ffffff" stroke={COLORS.slate} strokeWidth={0.8} />
      <Label x={82} y={26} size={9} fill={COLORS.green}>
        سلول گیاهی
      </Label>
      <Callout x={82} y={156} toX={82} toY={142} color={COLORS.green}>
        دیوارهٔ سلولزی
      </Callout>
      <Callout x={13} y={92} toX={70} toY={90} color={COLORS.blue}>
        واکوئل مرکزی
      </Callout>
      <Callout x={40} y={74} toX={44} toY={62} color={COLORS.green}>
        کلروپلاست
      </Callout>
      <line x1="160" y1="26" x2="160" y2="158" stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
      {/* animal */}
      <circle cx="244" cy="88" r="52" fill="#eff6ff" stroke={COLORS.blue} strokeWidth={1.6} />
      <circle cx="244" cy="88" r="16" fill="#dbeafe" stroke={COLORS.blue} strokeWidth={1} />
      <circle cx="238" cy="60" r="4.5" fill="#c7d2fe" stroke={COLORS.violet} strokeWidth={0.8} />
      <circle cx="264" cy="70" r="4.5" fill="#c7d2fe" stroke={COLORS.violet} strokeWidth={0.8} />
      {[0, 1, 2, 3].map((index) => (
        <circle key={index} cx={220 + index * 16} cy={112 + (index % 2) * 8} r="4" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={0.8} />
      ))}
      <ellipse cx="276" cy="104" rx="11" ry="5" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={0.9} />
      <Label x={244} y={26} size={9} fill={COLORS.blue}>
        سلول جانوری
      </Label>
      <Callout x={300} y={62} toX={266} toY={70} color={COLORS.violet}>
        سانتریول
      </Callout>
      <Callout x={300} y={132} toX={278} toY={110} color={COLORS.rose}>
        لیزوزوم
      </Callout>
      <Label x={160} y={172} size={7.5} fill={COLORS.slate}>
        مشترک: هسته، میتوکندری، ریبوزوم، ER، گلژی
      </Label>
    </Frame>
  );
}

/** دولایهٔ فسفولیپیدی با کلسترول، پروتئین و گلیکوپروتئین. */
export function Membrane() {
  const heads = Array.from({ length: 14 }, (_, index) => 24 + index * 20);
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <Label x={160} y={18} size={7.5} fill={COLORS.slate}>
        بیرون سلول
      </Label>
      <Label x={160} y={164} size={7.5} fill={COLORS.slate}>
        درون سلول (سیتوپلاسم)
      </Label>
      {heads.map((x) => (
        <g key={x}>
          <circle cx={x} cy={62} r="6" fill={COLORS.blue} opacity={0.85} />
          <circle cx={x} cy={106} r="6" fill={COLORS.blue} opacity={0.85} />
          <line x1={x - 2.5} y1={68} x2={x - 2.5} y2={98} stroke={COLORS.amber} strokeWidth={1.5} />
          <line x1={x + 2.5} y1={68} x2={x + 2.5} y2={98} stroke={COLORS.amber} strokeWidth={1.5} />
        </g>
      ))}
      {/* cholesterol */}
      <rect x="128" y="76" width="4" height="16" rx="2" fill={COLORS.violet} />
      <rect x="222" y="76" width="4" height="16" rx="2" fill={COLORS.violet} />
      <Callout x={128} y={130} toX={130} toY={92} color={COLORS.violet}>
        کلسترول
      </Callout>
      {/* channel protein */}
      <rect x="76" y="48" width="16" height="72" rx="6" fill={COLORS.greenSoft} stroke={COLORS.green} strokeWidth={1} />
      <rect x="82" y="58" width="4" height="52" rx="2" fill="#ffffff" />
      <Callout x={60} y={34} toX={82} toY={48} color={COLORS.green}>
        پروتئین کانالی
      </Callout>
      {/* glycoprotein */}
      <rect x="196" y="48" width="14" height="34" rx="5" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={1} />
      {[0, 1, 2].map((index) => (
        <circle key={index} cx={199 + index * 4} cy={40 - index * 4} r="3" fill={COLORS.rose} opacity={0.7} />
      ))}
      <Callout x={252} y={30} toX={206} toY={44} color={COLORS.rose}>
        گلیکوپروتئین
      </Callout>
      <Label x={160} y={86} size={7} fill={COLORS.slate}>
        دولایهٔ لیپیدی ~۵ نانومتر
      </Label>
    </Frame>
  );
}

/** پروتئین‌های غشایی: انتگرال، محیطی، گیرنده، آنزیم. */
export function MembraneProteins() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <rect x="20" y="66" width="280" height="38" fill="#e0f2fe" stroke="#bae6fd" strokeWidth={0.6} />
      <Label x={160} y={60} size={7} fill={COLORS.slate}>
        فضای بیرون
      </Label>
      <Label x={160} y={120} size={7} fill={COLORS.slate}>
        سیتوپلاسم
      </Label>
      {/* integral channel */}
      <rect x="44" y="52" width="18" height="66" rx="7" fill={COLORS.greenSoft} stroke={COLORS.green} strokeWidth={1} />
      <rect x="51" y="62" width="4" height="46" fill="#ffffff" />
      <Callout x={52} y={38} toX={53} toY={52} color={COLORS.green}>
        کانال
      </Callout>
      {/* receptor */}
      <path d="M106 52 h14 v20 h10 v46 h-34 v-46 h10 z" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={1} />
      <circle cx="113" cy="46" r="5" fill={COLORS.amber} opacity={0.85} />
      <Label x={113} y={32} size={7} fill={COLORS.amber}>
        لیگاند
      </Label>
      <Callout x={150} y={84} toX={120} toY={80} color={COLORS.blue}>
        گیرنده
      </Callout>
      {/* peripheral */}
      <rect x="176" y="106" width="26" height="12" rx="5" fill={COLORS.violetSoft} stroke={COLORS.violet} strokeWidth={1} />
      <Callout x={190} y={140} toX={189} toY={118} color={COLORS.violet}>
        پروتئین محیطی
      </Callout>
      {/* enzyme */}
      <rect x="228" y="50" width="30" height="24" rx="6" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={1} />
      <Label x={243} y={65} size={7} fill={COLORS.rose}>
        آنزیم
      </Label>
      <Callout x={264} y={44} toX={258} toY={50} color={COLORS.rose}>
        آدنیلات سیکلاز
      </Callout>
      {/* cytoskeleton anchor */}
      <line x1="176" y1="118" x2="176" y2="146" stroke={COLORS.slate} strokeWidth={1.6} />
      <Callout x={212} y={158} toX={178} toY={140} color={COLORS.slate}>
        اتصال به اسکلت سلولی
      </Callout>
    </Frame>
  );
}

/** هسته: پوشش دوغشایی، منافذ، کروماتین و هستک. */
export function Nucleus() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <circle cx="150" cy="86" r="62" fill="#eff6ff" stroke={COLORS.blue} strokeWidth={2} />
      <circle cx="150" cy="86" r="56" fill="none" stroke={COLORS.blue} strokeWidth={1} />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <circle key={angle} cx={150 + Math.cos(rad) * 59} cy={86 + Math.sin(rad) * 59} r="3" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={0.6} />
        );
      })}
      <path d="M116 88 q18 -22 38 -6 q16 14 34 2" fill="none" stroke={COLORS.violet} strokeWidth={2} strokeLinecap="round" />
      <path d="M120 112 q22 -10 34 6 q10 12 26 2" fill="none" stroke={COLORS.violet} strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />
      <circle cx="186" cy="62" r="13" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={1} opacity={0.9} />
      <Callout x={72} y={20} toX={124} toY={40} color={COLORS.blue}>
        پوشش هسته‌ای (۲ غشا)
      </Callout>
      <Callout x={258} y={34} toX={209} toY={63} color={COLORS.blue}>
        منفذ هسته‌ای
      </Callout>
      <Callout x={64} y={140} toX={126} toY={108} color={COLORS.violet}>
        کروماتین + هیستون
      </Callout>
      <Callout x={250} y={128} toX={196} toY={70} color={COLORS.rose}>
        هستک
      </Callout>
      <Label x={150} y={162} size={7} fill={COLORS.slate}>
        رونویسی در هسته، ترجمه در سیتوپلاسم
      </Label>
    </Frame>
  );
}

/** شبکهٔ آندوپلاسمی با ریبوزوم‌های متصل. */
export function ErRibosome() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <rect x="16" y="18" width="62" height="46" rx="10" fill="#eff6ff" stroke={COLORS.blue} strokeWidth={1.2} />
      <Label x={47} y={44} size={8} fill={COLORS.blue}>
        هسته
      </Label>
      {[0, 1, 2].map((index) => (
        <path
          key={index}
          d={`M96 ${40 + index * 34} q44 -20 88 0 q44 20 88 0`}
          fill="none"
          stroke={COLORS.green}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.35}
        />
      ))}
      {[
        [128, 32],
        [168, 30],
        [208, 34],
        [128, 66],
        [176, 70],
        [224, 64],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill={COLORS.charcoal} />
      ))}
      <path d="M244 76 q20 4 20 20" fill="none" stroke={COLORS.amber} strokeWidth={1.6} strokeDasharray="2 2" />
      <Label x={258} y={108} size={7.5} fill={COLORS.amber}>
        پلی‌پپتید
      </Label>
      <Callout x={106} y={18} toX={150} toY={30} color={COLORS.charcoal}>
        ریبوزوم متصل
      </Callout>
      <Callout x={286} y={30} toX={234} toY={40} color={COLORS.green}>
        ER زیرین
      </Callout>
      <Callout x={250} y={150} toX={250} toY={112} color={COLORS.green}>
        سیسترنا
      </Callout>
      <Label x={60} y={150} size={7.5} fill={COLORS.slate}>
        سیگنال پپتید → ورود به ER
      </Label>
    </Frame>
  );
}

/** دستگاه گلژی: ورود از سیس، خروج از ترانس. */
export function Golgi() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      {[0, 1, 2, 3].map((index) => (
        <path
          key={index}
          d={`M${108 + index * 8} ${44 + index * 22} q52 -14 104 0`}
          fill="none"
          stroke={COLORS.violet}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.55 - index * 0.08}
        />
      ))}
      <Arrow x1={44} y1={62} x2={102} y2={62} color={COLORS.green} width={1.6} />
      <circle cx="36" cy="62" r="7" fill={COLORS.greenSoft} stroke={COLORS.green} strokeWidth={0.8} />
      <Label x={36} y={46} size={7} fill={COLORS.green}>
        از ER
      </Label>
      <Callout x={74} y={24} toX={110} toY={44} color={COLORS.violet}>
        روی سیس
      </Callout>
      <Callout x={228} y={30} toX={220} toY={104} color={COLORS.violet}>
        روی ترانس
      </Callout>
      <Arrow x1={222} y1={116} x2={268} y2={140} color={COLORS.rose} width={1.6} />
      <circle cx="276" cy="144" r="7" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={0.8} />
      <Label x={284} y={162} size={7} fill={COLORS.rose}>
        ترشح / لیزوزوم
      </Label>
      <Label x={160} y={150} size={7.5} fill={COLORS.slate}>
        پردازش: گلیکوزیلاسیون و برچسب مقصد
      </Label>
    </Frame>
  );
}

/** میتوکندری: غشای بیرونی/درونی، کریستا، ماتریکس. */
export function Mitochondrion() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <ellipse cx="158" cy="88" rx="112" ry="52" fill="#fff7ed" stroke={COLORS.amber} strokeWidth={2.4} />
      <ellipse cx="158" cy="88" rx="104" ry="44" fill="none" stroke={COLORS.amber} strokeWidth={1.2} />
      {[0, 1, 2, 3, 4].map((index) => (
        <path
          key={index}
          d={`M${76 + index * 36} 50 q10 38 0 76`}
          fill="none"
          stroke={COLORS.rose}
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={0.75}
        />
      ))}
      <circle cx="214" cy="78" r="4" fill={COLORS.violet} />
      <circle cx="232" cy="96" r="3.4" fill={COLORS.violet} />
      <Callout x={58} y={22} toX={96} toY={48} color={COLORS.amber}>
        غشای بیرونی
      </Callout>
      <Callout x={92} y={150} toX={110} toY={110} color={COLORS.rose}>
        کریستا (غشای داخلی)
      </Callout>
      <Callout x={252} y={30} toX={220} toY={74} color={COLORS.violet}>
        ماتریکس + mtDNA
      </Callout>
      <Label x={160} y={166} size={7.5} fill={COLORS.slate}>
        زنجیرهٔ تنفسی ← گرادیان پروتون ← ATP
      </Label>
    </Frame>
  );
}

/** کلروپلاست: گرانا، تیلاکوئید، استروما. */
export function Chloroplast() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <ellipse cx="160" cy="86" rx="118" ry="54" fill="#ecfdf5" stroke={COLORS.green} strokeWidth={2.4} />
      <ellipse cx="160" cy="86" rx="110" ry="46" fill="none" stroke={COLORS.green} strokeWidth={1} />
      {[0, 1, 2].map((index) => (
        <g key={index}>
          {[0, 1, 2, 3].map((stack) => (
            <rect
              key={stack}
              x={70 + index * 62}
              y={62 + stack * 9}
              width={44}
              height={"6"}
              rx={3}
              fill="#34d399"
              opacity={0.55 + stack * 0.1}
              stroke={COLORS.green}
              strokeWidth={0.5}
            />
          ))}
        </g>
      ))}
      <Callout x={160} y={28} toX={114} toY={62} color={COLORS.green}>
        گرانا (تیلاکوئید)
      </Callout>
      <Callout x={268} y={140} toX={228} toY={112} color={COLORS.blue}>
        استروما
      </Callout>
      <Callout x={48} y={128} toX={74} toY={100} color={COLORS.blue}>
        واکنش نوری
      </Callout>
      <Label x={160} y={164} size={7.5} fill={COLORS.slate}>
        تیلاکوئید: نور ← ATP/NADPH | استروما: چرخهٔ کالوین
      </Label>
    </Frame>
  );
}

/** سه نوع رشتهٔ اسکلت سلولی. */
export function Cytoskeleton() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      {/* microfilaments */}
      {[0, 1, 2].map((index) => (
        <path key={index} d={`M40 ${50 + index * 12} q40 -14 80 0`} fill="none" stroke={COLORS.rose} strokeWidth={2} strokeLinecap="round" />
      ))}
      <Label x={80} y={30} size={8} fill={COLORS.rose}>
        ریزرشته (اکتین)
      </Label>
      <Label x={80} y={112} size={7} fill={COLORS.slate}>
        حرکت و انقباض
      </Label>
      {/* intermediate */}
      {[0, 1, 2, 3].map((index) => (
        <line key={index} x1={146} y1={38 + index * 4} x2={146} y2={132 - index * 4} stroke={COLORS.violet} strokeWidth={3} opacity={0.5 + index * 0.1} />
      ))}
      <Label x={170} y={30} size={8} fill={COLORS.violet}>
        رشتهٔ میانی
      </Label>
      <Label x={170} y={112} size={7} fill={COLORS.slate}>
        استحکام کششی
      </Label>
      {/* microtubules */}
      <rect x="222" y="44" width="10" height="88" rx="5" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={1} />
      <rect x="252" y="44" width="10" height="88" rx="5" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={1} />
      <rect x="282" y="44" width="10" height="88" rx="5" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={1} />
      <Label x={256} y={30} size={8} fill={COLORS.blue}>
        ریزلوله (توبولین)
      </Label>
      <Label x={256} y={150} size={7} fill={COLORS.slate}>
        دوک تقسیم و انتقال
      </Label>
    </Frame>
  );
}

/** نقشهٔ تعاملی اندامک‌ها (مدل آموزشی ساده‌شده). */
export function CellOverview() {
  const organelles: [string, number, number, string][] = [
    ["هسته", 128, 58, COLORS.blue],
    ["ریبوزوم", 84, 96, COLORS.charcoal],
    ["ER", 84, 122, COLORS.violet],
    ["گلژی", 132, 124, COLORS.violet],
    ["میتوکندری", 196, 108, COLORS.rose],
    ["لیزوزوم", 206, 66, COLORS.rose],
    ["واکوئل", 158, 84, COLORS.blue],
    ["اسکلت سلولی", 206, 142, COLORS.slate],
  ];
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <circle cx="158" cy="88" r="70" fill="#f0fdfa" stroke={COLORS.teal} strokeWidth={2} />
      {organelles.map(([name, x, y, color]) => (
        <g key={name}>
          <circle cx={x} cy={y} r={name === "هسته" ? 13 : 7} fill={`${color}22`} stroke={color} strokeWidth={1} />
          <Label x={x} y={y + 3} size={6.5} fill={color}>
            {name}
          </Label>
        </g>
      ))}
      <Label x={158} y={166} size={7} fill={COLORS.slate}>
        در درس، هر اندامک را انتخاب کنید تا نقش و ارتباطش را ببینید
      </Label>
    </Frame>
  );
}

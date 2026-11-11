import { Arrow, Callout, COLORS, Frame, Label } from "./primitives";

/** سه مسیر انتقال غیرفعال از غشا. */
export function Transport() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <rect x="10" y="70" width="300" height="30" fill="#e0f2fe" stroke="#bae6fd" strokeWidth={0.6} />
      <Label x={160} y={32} size={7.5} fill={COLORS.slate}>
        غلظت بالا
      </Label>
      <Label x={160} y={130} size={7.5} fill={COLORS.slate}>
        غلظت پایین
      </Label>
      {/* simple diffusion */}
      <Arrow x1={44} y1={52} x2={44} y2={118} color={COLORS.green} width={1.8} />
      <circle cx="44" cy="58" r="5" fill={COLORS.greenSoft} stroke={COLORS.green} strokeWidth={0.9} />
      <Label x={44} y={146} size={8} fill={COLORS.green}>
        انتشار ساده (O₂)
      </Label>
      {/* facilitated */}
      <rect x="124" y="64" width="14" height="42" rx="6" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={1} />
      <rect x="129" y="70" width="4" height="30" fill="#ffffff" />
      <Arrow x1={131} y1={52} x2={131} y2={118} color={COLORS.blue} width={1.4} dashed />
      <Label x={131} y={146} size={8} fill={COLORS.blue}>
        کانال (گلوکز/آب)
      </Label>
      {/* osmosis */}
      <rect x="214" y="64" width="14" height="42" rx="6" fill={COLORS.violetSoft} stroke={COLORS.violet} strokeWidth={1} />
      <Arrow x1={221} y1={52} x2={221} y2={118} color={COLORS.violet} width={1.4} />
      <Label x={240} y={146} size={8} fill={COLORS.violet}>
        اسمز (آب)
      </Label>
      <circle cx="221" cy="48" r="3.4" fill={COLORS.blue} />
      <Label x={221} y={40} size={6.5} fill={COLORS.blue}>
        H₂O
      </Label>
      <Label x={160} y={164} size={7} fill={COLORS.slate}>
        هر سه در جهت شیب و بدون مصرف ATP
      </Label>
    </Frame>
  );
}

/** پمپ سدیم–پتاسیم و انتقال فعال ثانویه. */
export function ActiveTransport() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <rect x="10" y="70" width="300" height="30" fill="#fef3c7" stroke="#fde68a" strokeWidth={0.6} />
      <rect x="96" y="58" width="46" height="54" rx="8" fill={COLORS.amberSoft} stroke={COLORS.amber} strokeWidth={1.2} />
      <Label x={119} y={88} size={7} fill={COLORS.amber}>
        ATPase
      </Label>
      <Arrow x1={70} y1={104} x2={100} y2={104} color={COLORS.blue} width={1.6} />
      <Label x={62} y={118} size={7} fill={COLORS.blue}>
        ۳Na⁺
      </Label>
      <Arrow x1={138} y1={62} x2={168} y2={62} color={COLORS.green} width={1.6} />
      <Label x={176} y={58} size={7} fill={COLORS.green}>
        ۲K⁺
      </Label>
      <circle cx="119" cy="42" r="6" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={0.9} />
      <Label x={119} y={30} size={6.5} fill={COLORS.rose}>
        ATP
      </Label>
      <Callout x={214} y={104} toX={142} toY={96} color={COLORS.amber}>
        خلاف شیب غلظت
      </Callout>
      <Callout x={214} y={132} toX={142} toY={84} color={COLORS.blue}>
        ایجاد پتانسیل غشا
      </Callout>
      {/* secondary */}
      <rect x="242" y="58" width="42" height="54" rx="6" fill={COLORS.greenSoft} stroke={COLORS.green} strokeWidth={1} />
      <Label x={263} y={86} size={6.5} fill={COLORS.green}>
        سیم‌پورت
      </Label>
      <Arrow x1={263} y1={46} x2={263} y2={112} color={COLORS.green} width={1.2} dashed />
      <Label x={286} y={46} size={6.5} fill={COLORS.green}>
        Na⁺ + گلوکز
      </Label>
      <Label x={160} y={150} size={7} fill={COLORS.slate}>
        اولیه: ATP مستقیم | ثانویه: انرژی از شیب یونی
      </Label>
    </Frame>
  );
}

/** انتقال وزیکولی: درون‌غشایی، اندوسیتوز و اگزوسیتوز. */
export function Vesicular() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      {/* membrane */}
      <rect x="20" y="30" width="280" height="7" rx="3" fill={COLORS.blue} opacity={0.5} />
      <rect x="20" y="136" width="280" height="7" rx="3" fill={COLORS.blue} opacity={0.5} />
      <Label x={160} y={24} size={7} fill={COLORS.slate}>
        غشای پلاسمایی
      </Label>
      {/* ER -> golgi -> vesicle -> membrane */}
      <rect x="42" y="52" width="44" height="26" rx="6" fill={COLORS.violetSoft} stroke={COLORS.violet} strokeWidth={0.9} />
      <Label x={64} y={68} size={7} fill={COLORS.violet}>
        ER
      </Label>
      <Arrow x1={90} y1={65} x2={112} y2={65} color={COLORS.slate} width={1.2} />
      <path d="M120 56 q26 -6 50 0 M120 66 q26 -6 50 0" fill="none" stroke={COLORS.violet} strokeWidth={3} opacity={0.6} strokeLinecap="round" />
      <Label x={146} y={48} size={7} fill={COLORS.violet}>
        گلژی
      </Label>
      <Arrow x1={176} y1={66} x2={198} y2={86} color={COLORS.slate} width={1.2} />
      <circle cx="208" cy="96" r="11" fill="#ffffff" stroke={COLORS.green} strokeWidth={1.2} />
      <Label x={208} y={99} size={6} fill={COLORS.green}>
        وزیکول
      </Label>
      <Arrow x1={214} y1={84} x2={230} y2={44} color={COLORS.green} width={1.4} />
      <Label x={248} y={42} size={7} fill={COLORS.green}>
        اگزوسیتوز
      </Label>
      {/* endocytosis */}
      <path d="M92 136 q18 22 36 0" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={1.2} />
      <circle cx="110" cy="122" r="8" fill="#ffffff" stroke={COLORS.rose} strokeWidth={1} />
      <Label x={110} y={125} size={5.8} fill={COLORS.rose}>
        LDL
      </Label>
      <Label x={96} y={162} size={7} fill={COLORS.rose}>
        اندوسیتوز وابسته به گیرنده
      </Label>
      <Label x={210} y={150} size={7} fill={COLORS.slate}>
        کلاترین + SNARE
      </Label>
    </Frame>
  );
}

/** چرخهٔ سلولی به‌صورت چرخ و نقاط وارسی. */
export function CellCycle() {
  const phases: [string, number, string][] = [
    ["G1", -60, COLORS.green],
    ["S", 30, COLORS.blue],
    ["G2", 120, COLORS.violet],
    ["M", 200, COLORS.rose],
  ];
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <circle cx="150" cy="88" r="56" fill="none" stroke="#e2e8f0" strokeWidth={10} />
      {phases.map(([name, angle, color]) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <g key={name}>
            <circle cx={150 + Math.cos(rad) * 56} cy={88 + Math.sin(rad) * 56} r="11" fill={`${color}22`} stroke={color} strokeWidth={1.4} />
            <Label x={150 + Math.cos(rad) * 56} y={91 + Math.sin(rad) * 56} size={8} fill={color}>
              {name}
            </Label>
          </g>
        );
      })}
      <Label x={150} y={84} size={8} fill={COLORS.charcoal}>
        چرخهٔ سلولی
      </Label>
      <Label x={150} y={96} size={6.5} fill={COLORS.slate}>
        اینترفاز + مرحلهٔ M
      </Label>
      <path d="M92 132 q-18 22 6 30 h40" fill="none" stroke={COLORS.slate} strokeWidth={1.2} strokeDasharray="3 2" />
      <Label x={62} y={164} size={7} fill={COLORS.slate}>
        G0 (خروج از چرخه)
      </Label>
      <Callout x={264} y={44} toX={196} toY={62} color={COLORS.amber}>
        نقاط وارسی
      </Callout>
      <Callout x={264} y={140} toX={204} toY={104} color={COLORS.rose}>
        میتوز و سیتوکینز
      </Callout>
      <Label x={44} y={44} size={7} fill={COLORS.blue}>
        S: همانندسازی DNA
      </Label>
    </Frame>
  );
}

/** مراحل میتوز در پنج نمای کنار هم. */
export function Mitosis() {
  const stages: [string, number][] = [
    ["پروفاز", 0],
    ["متافاز", 1],
    ["آنافاز", 2],
    ["تلوفاز", 3],
  ];
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      {stages.map(([name, index]) => {
        const cx = 44 + index * 78;
        return (
          <g key={name}>
            <circle cx={cx} cy="88" r="30" fill="#f0fdfa" stroke={COLORS.teal} strokeWidth={1.2} />
            {index === 0 ? (
              <g>
                <path d="M-14 0 q14 -10 28 0" transform={`translate(${cx} 84)`} fill="none" stroke={COLORS.violet} strokeWidth={2.4} />
                <path d="M-14 10 q14 -10 28 0" transform={`translate(${cx} 84)`} fill="none" stroke={COLORS.violet} strokeWidth={2.4} opacity={0.6} />
              </g>
            ) : null}
            {index === 1 ? (
              <g>
                {[-14, -4, 6].map((dx) => (
                  <rect key={dx} x={cx + dx} y={80} width={7} height={16} rx={3} fill={COLORS.violet} opacity={0.8} />
                ))}
                <line x1={cx} y1={58} x2={cx} y2={118} stroke={COLORS.rose} strokeWidth={1.2} strokeDasharray="2 2" />
              </g>
            ) : null}
            {index === 2 ? (
              <g>
                {[-16, 10].map((dx) => (
                  <rect key={dx} x={cx + dx} y={80} width={7} height={16} rx={3} fill={COLORS.violet} opacity={0.85} />
                ))}
                <line x1={cx - 26} y1={88} x2={cx + 26} y2={88} stroke={COLORS.rose} strokeWidth={1.2} />
              </g>
            ) : null}
            {index === 3 ? (
              <g>
                <circle cx={cx - 13} cy={88} r="10" fill="#dbeafe" stroke={COLORS.blue} strokeWidth={0.9} />
                <circle cx={cx + 13} cy={88} r="10" fill="#dbeafe" stroke={COLORS.blue} strokeWidth={0.9} />
              </g>
            ) : null}
            <Label x={cx} y={140} size={8} fill={COLORS.charcoal}>
              {name}
            </Label>
          </g>
        );
      })}
      <Label x={160} y={162} size={7} fill={COLORS.slate}>
        دو سلول دختر با همان تعداد کروموزوم سلول مادر
      </Label>
    </Frame>
  );
}

/** میوز: دو تقسیم پشت‌سرهم و کاهش تعداد کروموزوم. */
export function Meiosis() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      <circle cx="42" cy="86" r="26" fill="#eff6ff" stroke={COLORS.blue} strokeWidth={1.2} />
      <Label x={42} y={90} size={8} fill={COLORS.blue}>
        ۲n
      </Label>
      <Label x={42} y={130} size={7} fill={COLORS.slate}>
        سلول مادر
      </Label>
      <Arrow x1={72} y1={86} x2={108} y2={86} color={COLORS.slate} width={1.4} />
      <Label x={90} y={74} size={7} fill={COLORS.slate}>
        میوز I
      </Label>
      {[0, 1].map((index) => (
        <g key={index}>
          <circle cx={140} cy={54 + index * 64} r="20" fill="#ecfdf5" stroke={COLORS.green} strokeWidth={1.2} />
          <path d={`M${126} ${54 + index * 64} q14 -8 28 0`} fill="none" stroke={COLORS.violet} strokeWidth={2.2} />
          <Label x={140} y={54 + index * 64 + 30} size={7} fill={COLORS.green}>
            n
          </Label>
        </g>
      ))}
      <Arrow x1={166} y1={54} x2={200} y2={42} color={COLORS.slate} width={1.2} />
      <Arrow x1={166} y1={118} x2={200} y2={130} color={COLORS.slate} width={1.2} />
      <Label x={182} y={96} size={7} fill={COLORS.slate}>
        میوز II
      </Label>
      {[0, 1, 2, 3].map((index) => (
        <circle
          key={index}
          cx={232 + (index % 2) * 40}
          cy={index < 2 ? 34 : 128}
          r="14"
          fill="#faf5ff"
          stroke={COLORS.violet}
          strokeWidth={1}
        />
      ))}
      <Label x={252} y={94} size={7} fill={COLORS.violet}>
        ۴ سلول هاپلوئید
      </Label>
      <Callout x={252} y={166} toX={214} toY={144} color={COLORS.amber}>
        کراسینگ‌اور و تفکیک مستقل
      </Callout>
    </Frame>
  );
}

/** دو مسیر آپوپتوز و تلاقی آن‌ها در کاسپازهای اجرایی. */
export function Apoptosis() {
  return (
    <Frame viewBox="0 0 320 170">
      <rect x="0" y="0" width="320" height="170" fill="#f8fafc" />
      {/* extrinsic */}
      <rect x="18" y="18" width="76" height="22" rx="6" fill={COLORS.blueSoft} stroke={COLORS.blue} strokeWidth={0.9} />
      <Label x={56} y={32} size={7} fill={COLORS.blue}>
        گیرندهٔ مرگ (Fas)
      </Label>
      <Arrow x1={56} y1={44} x2={56} y2={66} color={COLORS.blue} width={1.3} />
      <Label x={56} y={78} size={7} fill={COLORS.blue}>
        کاسپاز-۸
      </Label>
      {/* intrinsic */}
      <ellipse cx="56" cy="120" rx="38" ry="20" fill="#fff7ed" stroke={COLORS.amber} strokeWidth={1} />
      <Label x={56} y={124} size={6.5} fill={COLORS.amber}>
        میتوکندری
      </Label>
      <Arrow x1={100} y1={120} x2={132} y2={120} color={COLORS.amber} width={1.3} />
      <Label x={112} y={108} size={6.5} fill={COLORS.amber}>
        سیتوکروم c
      </Label>
      <Arrow x1={100} y1={30} x2={132} y2={96} color={COLORS.blue} width={1.3} />
      {/* common path */}
      <circle cx="152" cy="120" r="16" fill={COLORS.violetSoft} stroke={COLORS.violet} strokeWidth={1} />
      <Label x={152} y={123} size={6.5} fill={COLORS.violet}>
        آپوپتوزوم
      </Label>
      <Arrow x1={170} y1={116} x2={200} y2={100} color={COLORS.rose} width={1.4} />
      <Label x={186} y={132} size={6.5} fill={COLORS.violet}>
        کاسپاز-۹
      </Label>
      <circle cx="214" cy="94" r="18" fill={COLORS.roseSoft} stroke={COLORS.rose} strokeWidth={1.2} />
      <Label x={214} y={90} size={6.5} fill={COLORS.rose}>
        کاسپاز
      </Label>
      <Label x={214} y={100} size={6.5} fill={COLORS.rose}>
        اجرایی ۳
      </Label>
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <circle cx={252 + index * 22} cy={140} r="7" fill="#f1f5f9" stroke={COLORS.slate} strokeWidth={0.8} />
        </g>
      ))}
      <Arrow x1={228} y1={110} x2={252} y2={132} color={COLORS.slate} width={1.2} />
      <Label x={274} y={162} size={6.5} fill={COLORS.slate}>
        جسم‌های آپوپتوزی
      </Label>
      <Label x={160} y={26} size={7.5} fill={COLORS.charcoal}>
        مسیر بیرونی (بالا) و درونی (پایین) ← مرگ کنترل‌شده
      </Label>
    </Frame>
  );
}

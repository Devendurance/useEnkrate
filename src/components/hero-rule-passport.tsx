import { cx } from "./ui";
import { SUPPORTED_ASSETS } from "@/lib/mainnet-config";

type HeroRulePassportProps = {
  className?: string;
  id?: string;
};

const desktopGates = [
  { label: ["Market", "session"], x: 214 },
  { label: ["Oracle", "freshness"], x: 330 },
  { label: ["Slippage"], x: 446 },
  { label: ["Approved", "token"], x: 562 },
  { label: ["Spend", "cap"], x: 678 },
] as const;

const mobileGates = [
  "Market session",
  "Oracle freshness",
  "Slippage",
  "Approved token",
  "Spend cap",
] as const;

function DesktopPassport() {
  return (
    <svg
      viewBox="0 0 880 560"
      className="hidden h-auto w-full min-[1024px]:block"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="18" y="18" width="844" height="524" rx="18" fill="#F7F6F2" />
      <path d="M42 70H838" stroke="#E7E5DF" />
      <text x="42" y="52" fill="#0F1596" className="font-mono" fontSize="11" letterSpacing="2">
        RULE PASSPORT / EXAMPLE ROUTE
      </text>

      <rect x="42" y="92" width="126" height="74" rx="6" fill="#0A0A0A" />
      <text x="58" y="119" fill="#D4FF4D" className="font-mono" fontSize="10" letterSpacing="1.5">
        RULE
      </text>
      <text x="58" y="144" fill="#FFFFFF" className="font-mono" fontSize="14">
        R-0042
      </text>
      <text x="58" y="184" fill="#4A4946" className="font-mono" fontSize="10">
        {SUPPORTED_ASSETS.NVDAc.symbol} / recurring
      </text>

      <line x1="168" y1="129" x2="738" y2="129" stroke="#0F1596" strokeWidth="2" className="passport-flow" />
      <line x1="738" y1="129" x2="770" y2="129" stroke="#0F1596" strokeWidth="2" />

      {desktopGates.map((gate, index) => {
        const highlighted = index === 1;
        return (
          <g key={gate.label.join(" ")}>
            <rect
              x={gate.x - 42}
              y="84"
              width="84"
              height="154"
              rx="4"
              fill={highlighted ? "#D4FF4D" : "#FFFFFF"}
              stroke="#0A0A0A"
              strokeWidth="1.5"
            />
            <rect x={gate.x - 14} y="112" width="28" height="28" fill={highlighted ? "#0A0A0A" : "#F7F6F2"} stroke="#0F1596" strokeWidth="2" />
            <text x={gate.x} y="162" textAnchor="middle" fill="#0F1596" className="font-mono" fontSize="9" letterSpacing="1.2">
              PASS
            </text>
            {gate.label.map((line, lineIndex) => (
              <text key={line} x={gate.x} y={271 + lineIndex * 16} textAnchor="middle" fill="#0A0A0A" className="font-sans" fontSize="13">
                {line}
              </text>
            ))}
          </g>
        );
      })}

      <rect x="770" y="84" width="74" height="92" rx="8" fill="#0F1596" />
      <text x="807" y="119" textAnchor="middle" fill="#FFFFFF" className="font-mono" fontSize="10" letterSpacing="1.5">
        RECEIPT
      </text>
      <text x="807" y="143" textAnchor="middle" fill="#FFFFFF" className="font-sans" fontSize="12">
        outcome
      </text>

      <path d="M716 238V358H566" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeDasharray="5 6" />
      <rect x="566" y="358" width="278" height="78" rx="8" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="1.5" strokeDasharray="5 6" />
      <text x="588" y="386" fill="#4A4946" className="font-mono" fontSize="9" letterSpacing="1.1">
        ALTERNATE OUTCOME
      </text>
      <text x="588" y="415" fill="#0A0A0A" className="font-sans" fontSize="16">
        Rejected: reason
      </text>

      <text x="42" y="482" fill="#4A4946" className="font-mono" fontSize="10" letterSpacing="1.1">
        FIVE CHECKS BEFORE A RULE CAN RUN
      </text>
      <path d="M42 498H324" stroke="#0F1596" strokeWidth="2" />
    </svg>
  );
}

function MobilePassport() {
  return (
    <svg
      viewBox="0 0 360 760"
      className="h-auto w-full min-[1024px]:hidden"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="12" y="12" width="336" height="736" rx="16" fill="#F7F6F2" />
      <text x="36" y="42" fill="#0F1596" className="font-mono" fontSize="10" letterSpacing="1.5">
        RULE PASSPORT / EXAMPLE ROUTE
      </text>

      <rect x="36" y="62" width="164" height="64" rx="6" fill="#0A0A0A" />
      <text x="52" y="88" fill="#D4FF4D" className="font-mono" fontSize="9" letterSpacing="1.4">
        RULE R-0042
      </text>
      <text x="52" y="110" fill="#FFFFFF" className="font-sans" fontSize="13">
        {SUPPORTED_ASSETS.NVDAc.symbol} / recurring
      </text>

      <line x1="66" y1="160" x2="66" y2="534" stroke="#0F1596" strokeWidth="2" className="passport-flow" />
      {mobileGates.map((label, index) => {
        const y = 150 + index * 76;
        const highlighted = index === 1;
        return (
          <g key={label}>
            <circle cx="66" cy={y + 26} r="7" fill={highlighted ? "#D4FF4D" : "#FFFFFF"} stroke="#0F1596" strokeWidth="2" />
            <rect x="94" y={y} width="232" height="52" rx="4" fill={highlighted ? "#D4FF4D" : "#FFFFFF"} stroke="#0A0A0A" strokeWidth="1.5" />
            <text x="112" y={y + 22} fill="#0A0A0A" className="font-sans" fontSize="14">
              {label}
            </text>
            <text x="307" y={y + 22} textAnchor="end" fill="#0F1596" className="font-mono" fontSize="9" letterSpacing="1">
              PASS
            </text>
          </g>
        );
      })}

      <rect x="94" y="562" width="232" height="66" rx="8" fill="#0F1596" />
      <text x="112" y="590" fill="#FFFFFF" className="font-mono" fontSize="10" letterSpacing="1.4">
        RECEIPT
      </text>
      <text x="112" y="612" fill="#FFFFFF" className="font-sans" fontSize="14">
        outcome
      </text>

      <rect x="94" y="654" width="232" height="52" rx="6" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="1.5" strokeDasharray="5 6" />
      <text x="112" y="685" fill="#0A0A0A" className="font-sans" fontSize="14">
        Rejected: reason
      </text>
    </svg>
  );
}

export function HeroRulePassport({ className, id = "hero-rule-passport" }: HeroRulePassportProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <div
      id={id}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      className={cx("w-full", className)}
    >
      <span id={titleId} className="sr-only">
        Example rule passport illustration
      </span>
      <span id={descriptionId} className="sr-only">
        A rule passes through Market session, Oracle freshness, Slippage,
        Approved token, and Spend cap checks before reaching a receipt. The
        illustration also shows an alternate rejected outcome.
      </span>
      <DesktopPassport />
      <MobilePassport />
    </div>
  );
}

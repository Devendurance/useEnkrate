"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ConnectWallet } from "@/components/connect-wallet";
import { EligibilityNote } from "@/components/eligibility-note";
import { GuardrailStrip } from "@/components/guardrail-strip";
import { Caption, buttonClasses, cx, focusRingClasses } from "@/components/ui";
import { useWallet } from "@/components/web3-provider";
import { engineAbi, erc20Abi } from "@/lib/enkrate-abi";
import {
  DEPLOYMENTS,
  explorerTxUrl,
  MAINNET_ADDRESSES,
  REFERENCE_AGE_THRESHOLD_SECONDS,
  SUPPORTED_ASSETS,
  type SupportedAssetKey,
} from "@/lib/mainnet-config";
import { formatAge, formatDate, formatUsdPrice, formatUsdc, parsePrice, parseUsdc } from "@/lib/format";
import {
  ruleSubmissionArgs,
  sameRuleSubmission,
  SPEND_WINDOW_GUIDANCE,
  validateRuleDraft,
  type LiveReference,
  type RuleDraft,
  type RuleSubmission,
} from "@/lib/rule-builder";
import { confirmAllowance, firstErrorMessage, publicClient } from "@/lib/web3";

const CADENCES = ["Every 1 day", "Every 7 days", "Every 14 days", "Every 30 days"] as const;
const STEP_LABELS = ["Wallet", "What should happen?", "When may it run?", "What must be true?", "What is the spend limit?", "Review & sign"] as const;
type RuleType = "recurring" | "conditional";
type AssetSnapshot = LiveReference & { asset: SupportedAssetKey; approved: boolean; oraclePaused: boolean; transferPaused: boolean };
const inputClasses = "mt-2 h-12 w-full rounded-md border border-line-disabled bg-canvas px-4 text-ink outline-primary focus:border-primary focus:outline-2";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="text-sm font-medium text-ink">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-ink-700">{hint}</span>}</label>;
}

function OptionCard({ selected, title, support, onClick }: { selected: boolean; title: string; support: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={cx("cursor-pointer rounded-card border p-6 text-left transition-colors", focusRingClasses, selected ? "border-primary bg-primary/5" : "border-line bg-canvas hover:border-ink")}><span className="flex items-center justify-between"><span className="text-base font-semibold text-ink">{title}</span>{selected && <Check size={18} aria-hidden className="text-primary" />}</span><span className="mt-2 block text-sm text-ink-700">{support}</span></button>;
}

export default function NewRulePage() {
  const { account, executionRefreshKey, getWalletClient } = useWallet();
  const [step, setStep] = useState(0);
  const [ruleType, setRuleType] = useState<RuleType | null>(null);
  const [asset, setAsset] = useState<SupportedAssetKey>("NVDAc");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]>(CADENCES[1]);
  const [triggerPrice, setTriggerPrice] = useState("");
  const [referenceDeviation, setReferenceDeviation] = useState("1");
  const [slippage, setSlippage] = useState("1");
  const [dailyCap, setDailyCap] = useState("");
  const [allowAged, setAllowAged] = useState(false);
  const [expires, setExpires] = useState("");
  const [approvalBudget, setApprovalBudget] = useState("");
  const [triggerAcknowledged, setTriggerAcknowledged] = useState(false);
  const [assetSnapshot, setAssetSnapshot] = useState<AssetSnapshot>();
  const [referenceError, setReferenceError] = useState<{ asset: SupportedAssetKey; message: string }>();
  const [currentAllowance, setCurrentAllowance] = useState<bigint>();
  const [allowanceLoading, setAllowanceLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>();
  const [stepError, setStepError] = useState<string>();
  const [showValidation, setShowValidation] = useState(false);
  const [createdRuleId, setCreatedRuleId] = useState<bigint>();
  const [reviewedSubmission, setReviewedSubmission] = useState<RuleSubmission>();
  const [finalSubmission, setFinalSubmission] = useState<RuleSubmission>();
  const [approvalHash, setApprovalHash] = useState<string>();
  const lastStep = STEP_LABELS.length - 1;
  const [nowSeconds] = useState(() => BigInt(Math.floor(Date.now() / 1_000)));

  const draft: RuleDraft = {
    ruleType,
    assetAddress: SUPPORTED_ASSETS[asset].address,
    amount,
    dailyCap,
    approvalBudget,
    cadenceDays: Number(cadence.match(/\d+/)?.[0] ?? 0),
    triggerPrice,
    referenceDeviation,
    slippage,
    expires,
    allowAged,
    triggerAcknowledged,
  };
  const validation = validateRuleDraft(draft, {
    liveReference: assetSnapshot?.asset === asset ? assetSnapshot : undefined,
    nowSeconds,
  });
  const amountUnits = safeUsdc(amount);
  const capUnits = safeUsdc(dailyCap);
  const authorizationUnits = validation.authorizationUnits ?? safeUsdc(approvalBudget || dailyCap);
  const triggerErrors = validation.errors.filter((message) => message.startsWith("Trigger"));
  const triggerWarnings = validation.warnings.filter((warning) => warning.code === "TRIGGER_MATERIAL" || warning.code === "TRIGGER_STRONG");
  const allowanceConfirmed = currentAllowance !== undefined && currentAllowance >= authorizationUnits && authorizationUnits > 0n;
  const liveAssetSnapshot = assetSnapshot?.asset === asset ? assetSnapshot : undefined;
  const referenceLoading = !liveAssetSnapshot && referenceError?.asset !== asset;
  const canContinue = step === 0
    ? Boolean(account)
    : step === 1
      ? ruleType !== null
      : step === 2
        ? amountUnits > 0n && (ruleType === "recurring" || isPositivePrice(triggerPrice))
        : step === 3
          ? isPercentage(referenceDeviation) && isPercentage(slippage)
          : step === 4
            ? capUnits >= amountUnits && capUnits > 0n && authorizationUnits >= capUnits
            : true;
  const summary = ruleType === "recurring"
    ? `Buy ${amount || "—"} USDC of ${asset} ${cadence.toLowerCase()}.`
    : ruleType === "conditional"
      ? `Buy ${amount || "—"} USDC of ${asset} when the reference trigger is at or below $${triggerPrice || "—"}.`
      : "Choose a rule type to see the summary.";

  async function readAllowanceValue(blockNumber?: bigint) {
    if (!account || !DEPLOYMENTS.executionEngine) return undefined;
    return publicClient.readContract({
      address: MAINNET_ADDRESSES.usdc,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account, DEPLOYMENTS.executionEngine],
      ...(blockNumber === undefined ? {} : { blockNumber }),
    });
  }

  async function readAllowance() {
    if (!account || !DEPLOYMENTS.executionEngine) return undefined;
    setAllowanceLoading(true);
    try {
      const allowance = await readAllowanceValue();
      setCurrentAllowance(allowance);
      return allowance;
    } catch {
      setCurrentAllowance(undefined);
      return undefined;
    } finally {
      setAllowanceLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!DEPLOYMENTS.executionEngine) return () => undefined;
    void publicClient.readContract({
      address: DEPLOYMENTS.executionEngine,
      abi: engineAbi,
      functionName: "inspectAsset",
      args: [SUPPORTED_ASSETS[asset].address],
    }).then((result) => {
      if (cancelled) return;
      const [state, approved] = result as readonly [{
        referencePrice: bigint;
        referenceUpdatedAt: bigint;
        referenceAge: bigint;
        multiplier: bigint;
        oraclePaused: boolean;
        transferPaused: boolean;
      }, boolean];
      setAssetSnapshot({ ...state, approved, asset });
    }).catch((error) => {
      if (!cancelled) setReferenceError({ asset, message: firstErrorMessage(error) });
    });
    return () => { cancelled = true; };
  }, [asset, executionRefreshKey]);

  useEffect(() => {
    if (!account || step !== lastStep) return;
    // The review surface must begin with a fresh onchain allowance read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void readAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, authorizationUnits, executionRefreshKey, lastStep, step]);

  function continueStep() {
    setStepError(undefined);
    setShowValidation(false);
    if (!canContinue) {
      setStepError(step === 2 ? "Enter a positive amount and a valid trigger before continuing." : step === 3 ? "Enter percentages from 0 to 100." : step === 4 ? "The spend limit must cover the amount, and the authorization budget must cover the spend limit." : "Complete this step before continuing.");
      setShowValidation(true);
      return;
    }
    if (step === 4) {
      if (validation.errors.length > 0 || !validation.submission) {
        setStepError("Review the highlighted rule values before signing.");
        setShowValidation(true);
        return;
      }
      setReviewedSubmission(validation.submission);
      setFinalSubmission(undefined);
    }
    setStep((value) => Math.min(lastStep, value + 1));
  }

  async function submit() {
    if (!account || !DEPLOYMENTS.executionEngine || !ruleType) return;
    setBusy(true);
    setStatus(undefined);
    setApprovalHash(undefined);
    setShowValidation(true);
    try {
      if (validation.errors.length > 0 || !validation.submission) throw new Error(validation.errors[0] ?? "Complete the rule before signing.");
      const submission = validation.submission;
      setFinalSubmission(submission);
      if (!reviewedSubmission || !sameRuleSubmission(reviewedSubmission, submission)) {
        throw new Error("The rule changed after review. Return to the review step and confirm the updated submission.");
      }
      if (validation.authorizationUnits === undefined) throw new Error("Authorization budget is invalid.");
      const wallet = getWalletClient();

      if (createdRuleId) {
        const allowance = await readAllowance();
        if (allowance === undefined) throw new Error("Could not verify the current USDC allowance.");
        if (allowance >= validation.authorizationUnits) {
          setStatus(`Rule ${createdRuleId.toString()} is active. Bounded approval confirmed at ${formatUsdc(allowance)} USDC.`);
          return;
        }
        setStatus(`Rule ${createdRuleId.toString()} is active. Approve ${formatUsdc(validation.authorizationUnits)} USDC to the Enkrate engine.`);
        const approvalHash = await wallet.writeContract({ address: MAINNET_ADDRESSES.usdc, abi: erc20Abi, functionName: "approve", args: [DEPLOYMENTS.executionEngine, validation.authorizationUnits] });
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        if (approvalReceipt.status !== "success") throw new Error("USDC approval did not confirm successfully.");
        const confirmation = await confirmAllowance(
          (blockNumber) => readAllowanceValue(blockNumber),
          validation.authorizationUnits,
          approvalReceipt.blockNumber,
        );
        if (!confirmation) {
          setCurrentAllowance(undefined);
          setStatus("Approval confirmed, but the allowance could not be verified at the approval receipt block.");
          return;
        }
        setCurrentAllowance(confirmation.allowance);
        setApprovalHash(approvalHash);
        const sourceNote = confirmation.source === "receipt" ? " The approval receipt is verified while the latest RPC read catches up." : "";
        setStatus(`Rule ${createdRuleId.toString()} is active. Bounded approval confirmed at ${formatUsdc(confirmation.allowance)} USDC.${sourceNote}`);
        return;
      }

      setStatus("Submitting your rule to Base Mainnet...");
      const hash = await wallet.writeContract({ address: DEPLOYMENTS.executionEngine, abi: engineAbi, functionName: "createRule", args: ruleSubmissionArgs(submission) });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Rule transaction did not confirm successfully.");
      const created = receipt.logs.find((log) => log.address.toLowerCase() === DEPLOYMENTS.executionEngine?.toLowerCase());
      if (!created) throw new Error("Rule transaction confirmed but no RuleCreated event was found.");
      const ruleId = BigInt(created.topics[1] ?? "0x0");
      if (ruleId === 0n) throw new Error("Rule transaction confirmed but no rule ID was returned.");
      setCreatedRuleId(ruleId);
      const confirmedAllowance = await readAllowance();
      if (confirmedAllowance !== undefined && confirmedAllowance >= validation.authorizationUnits) {
        setStatus(`Rule ${ruleId.toString()} created. Bounded approval confirmed at ${formatUsdc(confirmedAllowance)} USDC.`);
      } else {
        setStatus(`Rule ${ruleId.toString()} created. Approval required before an execution can be attempted. Current onchain allowance is ${confirmedAllowance === undefined ? "unavailable" : `${formatUsdc(confirmedAllowance)} USDC`}.`);
      }
    } catch (error) {
      setStatus(firstErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const approvalLabel = allowanceLoading ? "Reading allowance..." : currentAllowance === undefined ? "Not read yet" : `${formatUsdc(currentAllowance)} USDC`;
  const triggerGuardState = liveAssetSnapshot && !liveAssetSnapshot.oraclePaused && !liveAssetSnapshot.transferPaused && liveAssetSnapshot.referenceAge <= BigInt(REFERENCE_AGE_THRESHOLD_SECONDS) ? "pass" : "waiting";

  return <div className="mx-auto max-w-[760px] px-6 py-16 lg:py-24">
    <Caption>Rule builder · Base Mainnet</Caption>
    <h1 className="font-display mt-4 text-4xl leading-tight tracking-[-0.01em] text-ink md:text-5xl">Create a rule</h1>
    <p className="mt-4 text-lg text-ink-700">Short, explicit steps. You sign each required transaction, and funds stay in your wallet until a rule executes.</p>
    <EligibilityNote className="mt-8" />
    <Caption className="mt-10">Step {step + 1} of {STEP_LABELS.length}</Caption>
    <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-y border-line py-4">{STEP_LABELS.map((label, index) => <li key={label} className={cx("flex items-center gap-2 font-mono text-xs tracking-[0.04em]", index === step ? "text-primary" : index < step ? "text-ink" : "text-muted")} aria-current={index === step ? "step" : undefined}><span className={cx("flex h-5 w-5 items-center justify-center rounded-xs border", index === step ? "border-primary bg-primary text-white" : index < step ? "border-ink bg-ink text-white" : "border-line-disabled")}>{index < step ? <Check size={12} aria-hidden /> : index + 1}</span>{label}</li>)}</ol>
    <div className="mt-10">
      {step === 0 && <section><h2 className="font-display text-2xl text-ink">Wallet & eligibility</h2><p className="mt-3 text-ink-700">Connect to Base Mainnet before reviewing or signing a live rule.</p><div className="mt-6"><ConnectWallet variant="secondary" /></div>{account && <p className="mt-4 text-sm text-primary">Connected to Base Mainnet. No transaction has been requested.</p>}</section>}
      {step === 1 && <section><h2 className="font-display text-2xl text-ink">What should happen?</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><OptionCard selected={ruleType === "recurring"} title="Recurring" support="Buy a fixed amount on a schedule." onClick={() => setRuleType("recurring")} /><OptionCard selected={ruleType === "conditional"} title="Conditional" support="Buy when the reference price meets your trigger." onClick={() => setRuleType("conditional")} /></div><div className="mt-8"><Field label="Target stock" hint="Only the two verified canonical B20 assets are supported."><select value={asset} onChange={(event) => setAsset(event.target.value as SupportedAssetKey)} className={inputClasses}><option value="NVDAc">NVDAc · NVIDIA Corporation</option><option value="AAPLc">AAPLc · Apple Inc.</option></select></Field></div></section>}
      {step === 2 && <section><h2 className="font-display text-2xl text-ink">When may it run?</h2><div className="mt-6 grid gap-6 sm:grid-cols-2"><Field label="USDC amount each time" hint="USDC leaves your wallet only when execution happens."><input type="number" min="0.000001" step="0.000001" inputMode="decimal" placeholder="25" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClasses} /></Field>{ruleType === "recurring" ? <Field label="Interval" hint="The rule repeats until it expires or you cancel it."><select value={cadence} onChange={(event) => setCadence(event.target.value as (typeof CADENCES)[number])} className={inputClasses}>{CADENCES.map((option) => <option key={option}>{option}</option>)}</select></Field> : <Field label="Trigger price at or below" hint="Use the live reference below as an anchor. The realized execution price is checked onchain."><input type="number" min="0.00000001" step="0.01" inputMode="decimal" placeholder="115" value={triggerPrice} onChange={(event) => setTriggerPrice(event.target.value)} aria-invalid={triggerErrors.length > 0} aria-describedby="trigger-guidance" className={inputClasses} /></Field>}</div>{ruleType === "conditional" && <div id="trigger-guidance" className="mt-6 space-y-3 rounded-md border border-line bg-surface p-5" aria-live="polite"><div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-sm font-semibold text-ink">Current live reference</span>{referenceLoading ? <span className="font-mono text-xs text-muted">Reading...</span> : liveAssetSnapshot ? <span className="font-mono text-sm text-ink">{formatUsdPrice(liveAssetSnapshot.referencePrice)} · raw {liveAssetSnapshot.referencePrice.toString()}</span> : <span className="font-mono text-xs text-muted">Unavailable</span>}</div>{liveAssetSnapshot && <p className="text-xs text-ink-700">Updated {formatAge(liveAssetSnapshot.referenceAge)}. The reference is {liveAssetSnapshot.referenceAge <= BigInt(REFERENCE_AGE_THRESHOLD_SECONDS) ? "within" : "outside"} the 24-hour freshness threshold.</p>}{referenceError?.asset === asset && <p className="text-sm text-reject">Live reference unavailable: {referenceError.message}</p>}{triggerWarnings.map((warning) => <p key={warning.code} className={cx("text-sm", warning.severity === "strong" ? "font-semibold text-reject" : "text-ink-700")}>{warning.message}</p>)}{triggerErrors.map((error) => <p key={error} className="text-sm font-semibold text-reject">{error}</p>)}{validation.requiresTriggerAcknowledgement && <label className="flex items-start gap-3 border-t border-line pt-3 text-sm text-ink"><input type="checkbox" checked={triggerAcknowledged} onChange={(event) => setTriggerAcknowledged(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#0F1596]" /><span>I understand this trigger is materially distant from the live reference and is intentional.</span></label>}</div>}</section>}
      {step === 3 && <section><h2 className="font-display text-2xl text-ink">What must be true?</h2><div className="mt-6 grid gap-6 sm:grid-cols-2"><Field label="Maximum reference deviation (%)" hint="The contract derives the minimum B20 output from this bound. The recommended MVP range is 1-2%."><input type="number" min="0" max="100" step="0.01" value={referenceDeviation} onChange={(event) => setReferenceDeviation(event.target.value)} className={inputClasses} /></Field><Field label="Provider slippage (%)" hint="Constrains the authenticated 1inch quote request. The recommended MVP range is approximately 0.5-1%."><input type="number" min="0" max="100" step="0.01" value={slippage} onChange={(event) => setSlippage(event.target.value)} className={inputClasses} /></Field><Field label="Expiry (optional)" hint="Leave blank for no expiry."><input type="date" value={expires} onChange={(event) => setExpires(event.target.value)} className={inputClasses} /></Field></div>{validation.warnings.filter((warning) => warning.code === "REFERENCE_DEVIATION_BROAD" || warning.code === "SLIPPAGE_BROAD").map((warning) => <p key={warning.code} className="mt-4 text-sm text-ink-700">{warning.message}</p>)}<label className="mt-6 flex items-start gap-3 text-sm text-ink"><input type="checkbox" checked={allowAged} onChange={(event) => setAllowAged(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#0F1596]" /><span><strong>Allow an aged reference</strong><span className="mt-1 block text-xs text-ink-700">The guard still enforces the stored deviation floor. An aged feed is not the same as a corporate-action hold.</span></span></label>{allowAged && <p className="mt-3 text-sm font-semibold text-reject">Aged-reference permission is active. Confirm that this is intentional.</p>}</section>}
      {step === 4 && <section><h2 className="font-display text-2xl text-ink">What is the spend limit?</h2><div className="mt-6 max-w-sm"><Field label="24-hour spend limit (USDC)" hint={SPEND_WINDOW_GUIDANCE}><input type="number" min="0.000001" step="0.000001" inputMode="decimal" placeholder="300" value={dailyCap} onChange={(event) => setDailyCap(event.target.value)} className={inputClasses} /></Field><Field label="Authorization budget (USDC)" hint="Prefer a finite approval equal to the displayed spend limit."><input type="number" min="0.000001" step="0.000001" inputMode="decimal" placeholder={dailyCap || "300"} value={approvalBudget} onChange={(event) => setApprovalBudget(event.target.value)} className={inputClasses} /></Field><p className="mt-6 rounded-md bg-accent p-4 text-sm font-medium text-ink">Enkrate may pull up to {formatUsdc(authorizationUnits)} USDC under this authorization. This is not custody.</p><p className="mt-4 text-sm text-ink-700">Current allowance to Enkrate: {approvalLabel}</p><button type="button" className={buttonClasses("secondary", "mt-3 h-10 px-4")} onClick={() => void readAllowance()} disabled={allowanceLoading}>Refresh allowance</button></div></section>}
      {step === 5 && (
        <section>
          <h2 className="font-display text-2xl text-ink">Review & sign</h2>
          <p className="mt-4 rounded-md border border-line bg-surface p-5 text-lg text-ink">
            {summary} {SPEND_WINDOW_GUIDANCE} Your finite authorization is {formatUsdc(authorizationUnits)} USDC.
          </p>
          {reviewedSubmission ? (
            <SubmissionDetails submission={reviewedSubmission} />
          ) : (
            <p className="mt-5 rounded-md bg-reject p-4 text-sm text-white">
              No reviewed submission is available. Return to the previous step and review the rule again.
            </p>
          )}
          <div className="mt-5 rounded-md border border-line bg-canvas p-5">
            <p className="font-mono text-xs tracking-[0.04em] text-ink-700 uppercase">Allowance evidence</p>
            <p className="mt-2 text-sm text-ink">Current onchain allowance: <strong>{approvalLabel}</strong></p>
            <p className="mt-1 text-sm text-ink-700">
              {allowanceConfirmed
                ? "Bounded approval confirmed at or above the exact authorization budget."
                : "Approval is not confirmed until a fresh onchain read meets the exact authorization budget."}
            </p>
          </div>
          {finalSubmission && (
            <div className="mt-5 rounded-md border border-primary bg-primary/5 p-5">
              <p className="font-mono text-xs tracking-[0.04em] text-primary uppercase">Final pre-sign snapshot</p>
              <p className="mt-2 text-sm text-ink">The final serialized object matched the reviewed submission field-for-field before the wallet call.</p>
              <SubmissionDetails submission={finalSubmission} compact />
            </div>
          )}
          <p className="mt-4 text-sm text-ink-700">
            Before signing, confirm the exact stock, amount, interval or trigger, reference deviation, provider slippage, expiry, aged-reference flag, and authorization budget above.
          </p>
          <GuardrailStrip
            className="mt-4"
            states={{
              "Approved token": liveAssetSnapshot?.approved ? "pass" : "waiting",
              "Oracle freshness": triggerGuardState,
              Slippage: validation.warnings.some((warning) => warning.code === "SLIPPAGE_BROAD") ? "waiting" : "pass",
              "Spend cap": capUnits >= amountUnits && capUnits > 0n ? "pass" : "waiting",
            }}
          />
          {showValidation && validation.errors.length > 0 && (
            <div className="mt-5 rounded-md bg-reject p-4 text-sm text-white" role="alert">
              <p className="font-semibold">Fix these values before signing:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {validation.errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
          <div
            className={cx(
              status || approvalHash ? "mt-6 rounded-md p-4 text-sm" : "sr-only",
              createdRuleId ? "bg-accent text-ink" : "bg-surface text-ink-700",
            )}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {status && <p>{status}</p>}
            {approvalHash && (
              <a
                href={explorerTxUrl(approvalHash)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-medium underline underline-offset-4 hover:text-primary"
              >
                View approval receipt
              </a>
            )}
          </div>
        </section>
      )}
      {stepError && <p className="mt-6 rounded-md bg-reject p-4 text-sm text-white" role="alert">{stepError}</p>}
    </div>
    <div className="mt-12 flex flex-col items-stretch justify-between gap-4 border-t border-line pt-8 min-[600px]:flex-row min-[600px]:items-center"><button type="button" className={buttonClasses("secondary", "w-full min-[600px]:w-auto")} disabled={step === 0 || busy || Boolean(createdRuleId)} onClick={() => { setStepError(undefined); setShowValidation(false); setStep((value) => Math.max(0, value - 1)); }}> <ArrowLeft size={16} aria-hidden />Back</button>{step < lastStep ? <button type="button" className={buttonClasses("primary", "w-full min-[600px]:w-auto")} disabled={!canContinue || busy} onClick={continueStep}>Continue<ArrowRight size={16} aria-hidden /></button> : <button type="button" className={buttonClasses("primary", "w-full min-[600px]:w-auto")} disabled={busy || Boolean(createdRuleId && allowanceConfirmed)} onClick={() => void submit()}>{busy ? "Waiting for Base..." : createdRuleId ? allowanceConfirmed ? "Rule active" : "Approve bounded USDC" : "Create rule"}</button>}</div>
  </div>;
}

function SubmissionDetails({ submission, compact = false }: { submission: RuleSubmission; compact?: boolean }) {
  return <dl className={cx("grid gap-3 border-y border-line py-5 text-sm sm:grid-cols-2", compact ? "mt-4" : "mt-5")}><div><dt className="text-ink-700">Target stock</dt><dd className="mt-0.5 break-all font-medium text-ink">{submission.targetStock}</dd></div><div><dt className="text-ink-700">Rule type</dt><dd className="mt-0.5 font-medium text-ink">{submission.ruleType === 0 ? "Recurring (0)" : "Conditional price (1)"}</dd></div><div><dt className="text-ink-700">Amount in</dt><dd className="mt-0.5 font-medium text-ink">{formatUsdc(submission.amountIn)} USDC <span className="font-mono text-xs text-ink-700">raw {submission.amountIn.toString()}</span></dd></div><div><dt className="text-ink-700">Maximum spend per window</dt><dd className="mt-0.5 font-medium text-ink">{formatUsdc(submission.maxSpendPerWindow)} USDC <span className="font-mono text-xs text-ink-700">raw {submission.maxSpendPerWindow.toString()}</span></dd></div><div><dt className="text-ink-700">Trigger price</dt><dd className="mt-0.5 font-medium text-ink">{submission.triggerPrice === 0n ? "Not used" : `${formatUsdPrice(submission.triggerPrice)} · raw ${submission.triggerPrice.toString()}`}</dd></div><div><dt className="text-ink-700">Interval seconds</dt><dd className="mt-0.5 font-medium text-ink">{submission.intervalSeconds.toString()}</dd></div><div><dt className="text-ink-700">Reference deviation</dt><dd className="mt-0.5 font-medium text-ink">{submission.maxReferenceDeviationBps.toString()} bps</dd></div><div><dt className="text-ink-700">Provider slippage</dt><dd className="mt-0.5 font-medium text-ink">{submission.maxSlippageBps.toString()} bps</dd></div><div><dt className="text-ink-700">Expiry</dt><dd className="mt-0.5 font-medium text-ink">{submission.expiresAt === 0n ? "No expiry" : `${formatDate(submission.expiresAt)} · Unix ${submission.expiresAt.toString()}`}</dd></div><div><dt className="text-ink-700">Allow aged reference</dt><dd className="mt-0.5 font-medium text-ink">{submission.allowAgedReference ? "true" : "false"}</dd></div></dl>;
}

function safeUsdc(value: string) {
  try { return parseUsdc(value); } catch { return 0n; }
}

function isPositivePrice(value: string) {
  try { parsePrice(value); return true; } catch { return false; }
}

function isPercentage(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim()) && Number(value) >= 0 && Number(value) <= 100;
}

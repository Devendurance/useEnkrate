// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IEnkrateExecutionEngine } from "./interfaces/IEnkrateExecutionEngine.sol";
import { IEnkrateAssetRegistry } from "./interfaces/IEnkrateAssetRegistry.sol";
import { IEnkrateGuard } from "./interfaces/IEnkrateGuard.sol";
import { IAggregationRouterV6 } from "./interfaces/IAggregationRouterV6.sol";
import { EnkrateGuard } from "./EnkrateGuard.sol";
import { OneInchV6Adapter } from "./adapters/OneInchV6Adapter.sol";

/// @title EnkrateExecutionEngine
/// @notice Permissionless, zero-persistent-custody execution of bounded B20 purchase rules.
/// @dev Shape A: exact USDC transferFrom → exact router approval → official 1inch router →
///      direct B20 settlement to the rule owner. No purchased B20 is retained by this contract.
contract EnkrateExecutionEngine is IEnkrateExecutionEngine, EnkrateGuard, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant WINDOW_SECONDS = 24 hours;
    address public constant ONE_INCH_ROUTER = 0x111111125421cA6dc452d289314280a0f8842A65;
    address public constant B20_FACTORY = 0xB20f000000000000000000000000000000000000;
    address public constant B20_ORACLE_REGISTRY = 0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD;
    address public constant B20_POLICY_REGISTRY = 0x8453000000000000000000000000000000000002;

    IERC20 public immutable usdc;

    uint256 private _nextRuleId = 1;
    mapping(uint256 => Rule) private _rules;
    mapping(uint256 => SpendWindow) private _spendWindows;

    error InvalidAddress();
    error InvalidAmount();
    error InvalidRuleConfiguration();
    error RuleNotFound();
    error NotRuleOwner();
    error RuleNotActive();
    error RuleExpired();
    error IntervalNotElapsed();
    error SpendLimitExceeded();
    error InsufficientBalance();
    error InsufficientAllowance();
    error AssetNotApproved();
    error CorporateActionHold();
    error ReferenceTooOld();
    error TransferPaused();
    error B20TransferPolicy();
    error OutputTooLow();
    error ConditionalPriceNotMet();
    error UnexpectedUSDCBalance();
    error IncorrectUSDCTransfer();
    error EngineRetainedStock();
    error RouterCallFailed();

    constructor(
        address initialOwner,
        address assetRegistry_,
        address referenceOracleRegistry_,
        address policyRegistry_,
        uint256 referenceAgeThreshold_
    )
        EnkrateGuard(assetRegistry_, referenceOracleRegistry_, policyRegistry_, referenceAgeThreshold_)
        Ownable(initialOwner)
    {
        if (initialOwner == address(0)) revert InvalidAddress();
        address configuredUsdc = IEnkrateAssetRegistry(assetRegistry_).usdc();
        if (configuredUsdc == address(0)) revert InvalidAddress();
        usdc = IERC20(configuredUsdc);
    }

    function createRule(
        address targetStock,
        uint256 amountIn,
        uint256 maxSpendPerWindow,
        RuleType ruleType,
        uint256 triggerPrice,
        uint256 intervalSeconds,
        uint256 maxReferenceDeviationBps,
        uint256 maxSlippageBps,
        uint256 expiresAt,
        bool allowAgedReference
    )
        external
        override
        returns (uint256 ruleId)
    {
        if (targetStock == address(0) || amountIn == 0 || maxSpendPerWindow < amountIn) {
            revert InvalidRuleConfiguration();
        }
        if (maxSpendPerWindow > type(uint192).max || amountIn > type(uint192).max) {
            revert InvalidRuleConfiguration();
        }
        if (maxReferenceDeviationBps > BPS || maxSlippageBps > BPS) revert InvalidRuleConfiguration();
        if (!IEnkrateAssetRegistry(assetRegistry).isRegistered(targetStock)) revert AssetNotApproved();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidRuleConfiguration();

        if (ruleType == RuleType.RECURRING) {
            if (intervalSeconds == 0 || triggerPrice != 0) revert InvalidRuleConfiguration();
        } else if (ruleType == RuleType.CONDITIONAL_PRICE) {
            if (triggerPrice == 0 || intervalSeconds != 0) revert InvalidRuleConfiguration();
        } else {
            revert InvalidRuleConfiguration();
        }

        ruleId = _nextRuleId++;
        _rules[ruleId] = Rule({
            id: ruleId,
            owner: msg.sender,
            targetStock: targetStock,
            amountIn: amountIn,
            maxSpendPerWindow: maxSpendPerWindow,
            ruleType: ruleType,
            triggerPrice: triggerPrice,
            intervalSeconds: intervalSeconds,
            lastExecutedAt: 0,
            maxReferenceDeviationBps: maxReferenceDeviationBps,
            maxSlippageBps: maxSlippageBps,
            expiresAt: expiresAt,
            allowAgedReference: allowAgedReference,
            status: RuleStatus.ACTIVE
        });
        emit RuleCreated(ruleId, msg.sender, targetStock, ruleType, amountIn, expiresAt);
    }

    function cancelRule(uint256 ruleId) external override {
        Rule storage rule = _rules[ruleId];
        if (rule.id == 0) revert RuleNotFound();
        if (rule.owner != msg.sender) revert NotRuleOwner();
        if (rule.status != RuleStatus.ACTIVE) revert RuleNotActive();
        rule.status = RuleStatus.CANCELLED;
        emit RuleCancelled(ruleId, msg.sender);
    }

    function getRule(uint256 ruleId) external view override returns (Rule memory) {
        if (_rules[ruleId].id == 0) revert RuleNotFound();
        return _rules[ruleId];
    }

    function getSpendWindow(uint256 ruleId) external view override returns (SpendWindow memory window) {
        if (_rules[ruleId].id == 0) revert RuleNotFound();
        window = _spendWindows[ruleId];
        if (window.startedAt == 0 || block.timestamp >= uint256(window.startedAt) + WINDOW_SECONDS) {
            window.startedAt = uint64(block.timestamp);
            window.spent = 0;
        }
    }

    function canAttemptExecution(uint256 ruleId)
        external
        view
        override
        returns (bool canAttempt, ExecutionBlockReason reason, GuardState memory state)
    {
        Rule memory rule = _rules[ruleId];
        if (rule.id == 0 || rule.status != RuleStatus.ACTIVE) {
            return (false, ExecutionBlockReason.RULE_NOT_ACTIVE, state);
        }
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt) {
            return (false, ExecutionBlockReason.RULE_EXPIRED, state);
        }
        if (
            rule.ruleType == RuleType.RECURRING && rule.lastExecutedAt != 0
                && block.timestamp < rule.lastExecutedAt + rule.intervalSeconds
        ) {
            return (false, ExecutionBlockReason.INTERVAL_NOT_ELAPSED, state);
        }

        SpendWindow memory window = _spendWindows[ruleId];
        uint256 spent = window.startedAt == 0 || block.timestamp >= uint256(window.startedAt) + WINDOW_SECONDS
            ? 0
            : uint256(window.spent);
        if (spent + rule.amountIn > rule.maxSpendPerWindow) {
            return (false, ExecutionBlockReason.SPEND_LIMIT, state);
        }

        IEnkrateAssetRegistry.Asset memory asset =
            IEnkrateAssetRegistry(assetRegistry).getAsset(rule.targetStock);
        if (!asset.enabled) return (false, ExecutionBlockReason.ASSET_NOT_APPROVED, state);
        try this.inspectAsset(rule.targetStock) returns (GuardState memory inspected, bool approved) {
            state = inspected;
            if (!approved) return (false, ExecutionBlockReason.ASSET_NOT_APPROVED, state);
        } catch {
            return (false, ExecutionBlockReason.B20_STATE_UNAVAILABLE, state);
        }
        if (state.oraclePaused) return (false, ExecutionBlockReason.CORPORATE_ACTION_HOLD, state);
        if (state.transferPaused) return (false, ExecutionBlockReason.TRANSFER_PAUSED, state);
        if (state.referenceUpdatedAt == 0 || state.referencePrice == 0) {
            return (false, ExecutionBlockReason.REFERENCE_UNAVAILABLE, state);
        }
        if (state.referenceAge > referenceAgeThreshold && !rule.allowAgedReference) {
            return (false, ExecutionBlockReason.REFERENCE_TOO_OLD, state);
        }
        if (usdc.balanceOf(rule.owner) < rule.amountIn) {
            return (false, ExecutionBlockReason.INSUFFICIENT_BALANCE, state);
        }
        if (usdc.allowance(rule.owner, address(this)) < rule.amountIn) {
            return (false, ExecutionBlockReason.INSUFFICIENT_ALLOWANCE, state);
        }
        return (true, ExecutionBlockReason.NONE, state);
    }

    function requiredMinOut(
        uint256 ruleId,
        uint256 referencePrice,
        uint8 targetDecimals
    )
        public
        view
        override
        returns (uint256)
    {
        Rule memory rule = _rules[ruleId];
        if (rule.id == 0) revert RuleNotFound();
        if (referencePrice == 0 || targetDecimals > 18) revert InvalidRuleConfiguration();
        // A buy at most `maxReferenceDeviationBps` above the reference has this output floor.
        // Chainlink's value is already total-return/multiplier-adjusted; multiplier is not applied here.
        uint256 scale = 10 ** (uint256(targetDecimals) + 2);
        return Math.mulDiv(
            Math.mulDiv(rule.amountIn, scale, referencePrice), BPS, BPS + rule.maxReferenceDeviationBps
        );
    }

    function executeRule(
        uint256 ruleId,
        bytes calldata oneInchSwapCalldata
    )
        external
        override
        nonReentrant
        returns (uint256 amountOut, uint256 realizedPrice)
    {
        Rule storage rule = _rules[ruleId];
        if (rule.id == 0) revert RuleNotFound();
        if (rule.status != RuleStatus.ACTIVE) revert RuleNotActive();
        if (rule.expiresAt != 0 && block.timestamp > rule.expiresAt) revert RuleExpired();
        if (
            rule.ruleType == RuleType.RECURRING && rule.lastExecutedAt != 0
                && block.timestamp < rule.lastExecutedAt + rule.intervalSeconds
        ) revert IntervalNotElapsed();

        SpendWindow storage window = _spendWindows[ruleId];
        uint256 spent = window.startedAt == 0 || block.timestamp >= uint256(window.startedAt) + WINDOW_SECONDS
            ? 0
            : uint256(window.spent);
        if (spent + rule.amountIn > rule.maxSpendPerWindow) revert SpendLimitExceeded();

        IEnkrateAssetRegistry.Asset memory asset =
            IEnkrateAssetRegistry(assetRegistry).getAsset(rule.targetStock);
        if (!asset.enabled) revert AssetNotApproved();
        (GuardState memory state, bool approved) = inspectAsset(rule.targetStock);
        if (!approved) revert AssetNotApproved();
        if (state.oraclePaused) revert CorporateActionHold();
        if (state.transferPaused) revert TransferPaused();
        if (state.referenceUpdatedAt == 0 || state.referencePrice == 0) revert ReferenceUnavailable();
        if (state.referenceAge > referenceAgeThreshold && !rule.allowAgedReference) revert ReferenceTooOld();
        if (usdc.balanceOf(rule.owner) < rule.amountIn) revert InsufficientBalance();
        if (usdc.allowance(rule.owner, address(this)) < rule.amountIn) revert InsufficientAllowance();

        uint256 requiredOutput = requiredMinOut(ruleId, state.referencePrice, asset.decimals);
        (address executor,,) = OneInchV6Adapter.validate(
            oneInchSwapCalldata, address(usdc), rule.targetStock, rule.owner, rule.amountIn, requiredOutput
        );
        if (!_transferState(rule.targetStock, rule.owner, executor)) revert B20TransferPolicy();

        uint256 engineUsdcBefore = usdc.balanceOf(address(this));
        if (engineUsdcBefore != 0) revert UnexpectedUSDCBalance();
        uint256 ownerStockBefore = IERC20(rule.targetStock).balanceOf(rule.owner);
        uint256 engineStockBefore = IERC20(rule.targetStock).balanceOf(address(this));

        usdc.safeTransferFrom(rule.owner, address(this), rule.amountIn);
        if (usdc.balanceOf(address(this)) != rule.amountIn) revert IncorrectUSDCTransfer();

        usdc.forceApprove(ONE_INCH_ROUTER, rule.amountIn);
        (bool success, bytes memory result) = ONE_INCH_ROUTER.call(oneInchSwapCalldata);
        if (!success) _revertWithData(result);
        if (result.length != 64) revert RouterCallFailed();
        (uint256 routerAmountOut, uint256 routerSpentAmount) = abi.decode(result, (uint256, uint256));
        usdc.forceApprove(ONE_INCH_ROUTER, 0);

        uint256 engineUsdcAfter = usdc.balanceOf(address(this));
        if (engineUsdcAfter < engineUsdcBefore || engineUsdcAfter > engineUsdcBefore + rule.amountIn) {
            revert IncorrectUSDCTransfer();
        }
        uint256 unused = engineUsdcAfter - engineUsdcBefore;
        if (unused != 0) usdc.safeTransfer(rule.owner, unused);
        uint256 actualSpent = rule.amountIn - unused;

        uint256 ownerStockAfter = IERC20(rule.targetStock).balanceOf(rule.owner);
        uint256 engineStockAfter = IERC20(rule.targetStock).balanceOf(address(this));
        if (engineStockAfter != engineStockBefore) revert EngineRetainedStock();
        if (ownerStockAfter < ownerStockBefore) revert OutputTooLow();
        amountOut = ownerStockAfter - ownerStockBefore;
        if (amountOut < requiredOutput) revert OutputTooLow();
        if (routerAmountOut != amountOut || routerSpentAmount != actualSpent) revert OutputTooLow();
        realizedPrice = Math.mulDiv(actualSpent, 10 ** (uint256(asset.decimals) + 2), amountOut);
        if (rule.ruleType == RuleType.CONDITIONAL_PRICE && realizedPrice > rule.triggerPrice) {
            revert ConditionalPriceNotMet();
        }

        uint256 newSpent = spent + rule.amountIn;
        if (window.startedAt == 0 || block.timestamp >= uint256(window.startedAt) + WINDOW_SECONDS) {
            window.startedAt = uint64(block.timestamp);
            window.spent = uint192(rule.amountIn);
        } else {
            window.spent = uint192(newSpent);
        }
        rule.lastExecutedAt = block.timestamp;
        if (rule.ruleType == RuleType.CONDITIONAL_PRICE) rule.status = RuleStatus.EXECUTED;

        emit RuleExecuted(
            ruleId,
            rule.owner,
            rule.targetStock,
            rule.amountIn,
            amountOut,
            realizedPrice,
            state.referencePrice,
            state.referenceUpdatedAt,
            state.multiplier,
            block.timestamp
        );
    }

    function _revertWithData(bytes memory data) private pure {
        if (data.length == 0) revert RouterCallFailed();
        assembly {
            revert(add(data, 32), mload(data))
        }
    }
}

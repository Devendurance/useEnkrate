// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IEnkrateGuard } from "./IEnkrateGuard.sol";

interface IEnkrateExecutionEngine is IEnkrateGuard {
    enum RuleType {
        RECURRING,
        CONDITIONAL_PRICE
    }

    enum RuleStatus {
        ACTIVE,
        CANCELLED,
        EXECUTED
    }

    struct Rule {
        uint256 id;
        address owner;
        address targetStock;
        uint256 amountIn;
        uint256 maxSpendPerWindow;
        RuleType ruleType;
        uint256 triggerPrice;
        uint256 intervalSeconds;
        uint256 lastExecutedAt;
        uint256 maxReferenceDeviationBps;
        uint256 maxSlippageBps;
        uint256 expiresAt;
        bool allowAgedReference;
        RuleStatus status;
    }

    struct SpendWindow {
        uint64 startedAt;
        uint192 spent;
    }

    event RuleCreated(
        uint256 indexed ruleId,
        address indexed owner,
        address indexed targetStock,
        RuleType ruleType,
        uint256 amountIn,
        uint256 expiresAt
    );
    event RuleCancelled(uint256 indexed ruleId, address indexed owner);
    event RuleExecuted(
        uint256 indexed ruleId,
        address indexed owner,
        address indexed targetStock,
        uint256 amountIn,
        uint256 amountOut,
        uint256 realizedPrice,
        uint256 referencePrice,
        uint256 referenceUpdatedAt,
        uint256 multiplier,
        uint256 timestamp
    );

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
        returns (uint256 ruleId);

    function cancelRule(uint256 ruleId) external;
    function getRule(uint256 ruleId) external view returns (Rule memory);
    function getSpendWindow(uint256 ruleId) external view returns (SpendWindow memory);
    function canAttemptExecution(uint256 ruleId)
        external
        view
        returns (bool canAttempt, ExecutionBlockReason reason, GuardState memory state);
    function requiredMinOut(
        uint256 ruleId,
        uint256 referencePrice,
        uint8 targetDecimals
    )
        external
        view
        returns (uint256);
    function executeRule(
        uint256 ruleId,
        bytes calldata oneInchSwapCalldata
    )
        external
        returns (uint256 amountOut, uint256 realizedPrice);
}

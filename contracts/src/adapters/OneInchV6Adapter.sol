// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IAggregationRouterV6 } from "../interfaces/IAggregationRouterV6.sol";

/// @title OneInchV6Adapter
/// @notice Narrow decoder/validator for the observed 1inch Classic Swap V6 `swap` call.
/// @dev This is intentionally a library. The engine, rather than an adapter-owned proxy,
///      calls the immutable official router so `msg.sender` remains the execution engine.
library OneInchV6Adapter {
    bytes4 internal constant SWAP_SELECTOR = 0x07ed2379;
    uint256 internal constant PARTIAL_FILL_FLAG = 1;

    error InvalidSelector();
    error MalformedCalldata();
    error WrongSourceToken();
    error WrongDestinationToken();
    error WrongDestinationReceiver();
    error WrongAmount();
    error MinimumOutputTooLow();
    error PartialFillNotAllowed();
    error InvalidExecutor();
    error InvalidSourceReceiver();

    function validate(
        bytes calldata swapCalldata,
        address sourceToken,
        address destinationToken,
        address destinationReceiver,
        uint256 amount,
        uint256 requiredMinimum
    )
        internal
        pure
        returns (address executor, IAggregationRouterV6.SwapDescription memory desc, bytes memory permit)
    {
        if (swapCalldata.length < 4) {
            revert MalformedCalldata();
        }
        bytes4 selector;
        assembly {
            selector := calldataload(swapCalldata.offset)
        }
        if (selector != SWAP_SELECTOR) revert InvalidSelector();

        // `abi.decode` reverts before any external call when the tuple is malformed.
        // The explicit length check above handles the common truncated-selector case.
        (executor, desc, permit) =
            abi.decode(swapCalldata[4:], (address, IAggregationRouterV6.SwapDescription, bytes));

        if (executor == address(0)) revert InvalidExecutor();
        if (desc.srcReceiver == address(0)) revert InvalidSourceReceiver();
        if (desc.srcToken != sourceToken) revert WrongSourceToken();
        if (desc.dstToken != destinationToken) revert WrongDestinationToken();
        if (desc.dstReceiver != destinationReceiver) revert WrongDestinationReceiver();
        if (desc.amount != amount) revert WrongAmount();
        if (desc.minReturnAmount < requiredMinimum) revert MinimumOutputTooLow();
        // A partial fill would make an exact one-rule execution ambiguous. The route may
        // still return unused USDC, but it must satisfy the hard output floor or revert.
        if (desc.flags & PARTIAL_FILL_FLAG != 0) revert PartialFillNotAllowed();
    }
}

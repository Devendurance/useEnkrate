// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAggregationRouterV6 {
    struct SwapDescription {
        address srcToken;
        address dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    function swap(
        address executor,
        SwapDescription calldata desc,
        bytes calldata permit
    )
        external
        payable
        returns (uint256 returnAmount, uint256 spentAmount);
}

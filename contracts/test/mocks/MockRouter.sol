// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAggregationRouterV6 } from "../../src/interfaces/IAggregationRouterV6.sol";

interface IEngineReentry {
    function executeRule(uint256 ruleId, bytes calldata data) external returns (uint256, uint256);
}

contract MockRouter is IAggregationRouterV6 {
    uint256 public outputAmount;
    bool public reenter;
    address public reentryEngine;
    uint256 public reentryRule;
    bytes public reentryData;

    function configure(uint256 outputAmount_) external {
        outputAmount = outputAmount_;
    }

    function configureReentry(address engine, uint256 ruleId, bytes calldata data) external {
        reenter = true;
        reentryEngine = engine;
        reentryRule = ruleId;
        reentryData = data;
    }

    function swap(
        address,
        SwapDescription calldata desc,
        bytes calldata
    )
        external
        payable
        override
        returns (uint256 returnAmount, uint256 spentAmount)
    {
        IERC20(desc.srcToken).transferFrom(msg.sender, address(this), desc.amount);
        if (reenter) IEngineReentry(reentryEngine).executeRule(reentryRule, reentryData);
        IERC20(desc.dstToken).transfer(desc.dstReceiver, outputAmount);
        return (outputAmount, desc.amount);
    }
}

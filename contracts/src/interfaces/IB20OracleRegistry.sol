// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IB20OracleRegistry {
    function getOracleParams(address token) external view returns (uint256 multiplier, bool paused);
}

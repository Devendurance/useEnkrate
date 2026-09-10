// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IB20Factory {
    function isB20(address token) external view returns (bool);
    function isB20Initialized(address token) external view returns (bool);
}

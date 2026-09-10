// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IB20Factory } from "../../src/interfaces/IB20Factory.sol";

contract MockFactory is IB20Factory {
    mapping(address => bool) public b20;
    mapping(address => bool) public initialized;

    function setB20(address token, bool isB20_, bool initialized_) external {
        b20[token] = isB20_;
        initialized[token] = initialized_;
    }

    function isB20(address token) external view override returns (bool) {
        return b20[token];
    }

    function isB20Initialized(address token) external view override returns (bool) {
        return initialized[token];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEnkrateAssetRegistry {
    struct Asset {
        address feed;
        uint8 decimals;
        bool enabled;
    }

    function usdc() external view returns (address);
    function b20Factory() external view returns (address);
    function getAsset(address token) external view returns (Asset memory);
    function isRegistered(address token) external view returns (bool);
}

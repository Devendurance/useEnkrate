// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IEnkrateAssetRegistry } from "./interfaces/IEnkrateAssetRegistry.sol";
import { IB20Factory } from "./interfaces/IB20Factory.sol";

/// @title EnkrateAssetRegistry
/// @notice Owner-managed allowlist of canonical Base B20 assets and official reference feeds.
/// @dev Addresses are the identity. Ticker/name metadata is deliberately not stored or trusted.
contract EnkrateAssetRegistry is Ownable, IEnkrateAssetRegistry {
    address public constant NVDAc = 0xb20000000000000000000078ee7ce2fE4908108C;
    address public constant AAPLc = 0xb200000000000000000000C2e324d24d7eEcd1fb;
    address public constant NVDAC_FEED = 0x04689a41629776563E6822F76f2e57D148d28513;
    address public constant AAPLC_FEED = 0x787f13dEa48Db0897CbCDD985de77809D837F988;

    address public immutable override usdc;
    address public immutable override b20Factory;

    mapping(address => Asset) private _assets;

    event AssetRegistered(address indexed token, address indexed feed, uint8 decimals);
    event AssetStatusUpdated(address indexed token, bool enabled);

    error InvalidAddress();
    error InvalidDecimals();
    error AssetAlreadyRegistered();
    error AssetNotRegistered();

    constructor(address initialOwner, address usdc_, address b20Factory_) Ownable(initialOwner) {
        if (usdc_ == address(0) || b20Factory_ == address(0)) revert InvalidAddress();
        usdc = usdc_;
        b20Factory = b20Factory_;
        _assets[NVDAc] = Asset({ feed: NVDAC_FEED, decimals: 8, enabled: true });
        _assets[AAPLc] = Asset({ feed: AAPLC_FEED, decimals: 8, enabled: true });
    }

    /// @notice Adds one canonical B20 and its Chainlink Coinbase feed.
    function registerAsset(address token, address feed, uint8 decimals_) external onlyOwner {
        if (token == address(0) || feed == address(0)) revert InvalidAddress();
        if (decimals_ == 0 || decimals_ > 18) revert InvalidDecimals();
        if (_assets[token].enabled) revert AssetAlreadyRegistered();

        // A registry entry is never sufficient by itself: execution also verifies the
        // official factory's initialized-B20 bit at the execution boundary.
        _assets[token] = Asset({ feed: feed, decimals: decimals_, enabled: true });
        emit AssetRegistered(token, feed, decimals_);
    }

    function setAssetEnabled(address token, bool enabled) external onlyOwner {
        if (_assets[token].feed == address(0)) revert AssetNotRegistered();
        _assets[token].enabled = enabled;
        emit AssetStatusUpdated(token, enabled);
    }

    function getAsset(address token) external view override returns (Asset memory) {
        return _assets[token];
    }

    function isRegistered(address token) external view override returns (bool) {
        return _assets[token].enabled;
    }

    function isOfficialB20(address token) external view returns (bool) {
        if (!_assets[token].enabled) return false;
        try IB20Factory(b20Factory).isB20(token) returns (bool isB20) {
            if (!isB20) return false;
            try IB20Factory(b20Factory).isB20Initialized(token) returns (bool initialized) {
                return initialized;
            } catch {
                return false;
            }
        } catch { }
        if (b20Factory.code.length != 0) return false;

        // Native B20 deployments expose the one-byte marker while the factory precompile
        // itself may have no EXTCODE-visible account.
        bytes memory code = token.code;
        return code.length == 1 && code[0] == bytes1(0xef);
    }
}

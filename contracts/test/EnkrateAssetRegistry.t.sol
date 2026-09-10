// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { EnkrateAssetRegistry } from "../src/EnkrateAssetRegistry.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockFactory } from "./mocks/MockFactory.sol";

contract EnkrateAssetRegistryTest is Test {
    address internal owner = address(0xA11CE);
    MockERC20 internal usdc;
    MockFactory internal factory;
    EnkrateAssetRegistry internal registry;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        factory = new MockFactory();
        registry = new EnkrateAssetRegistry(owner, address(usdc), address(factory));
    }

    function testCanonicalMvpEntriesArePresentByAddress() public view {
        EnkrateAssetRegistry.Asset memory nvda = registry.getAsset(registry.NVDAc());
        EnkrateAssetRegistry.Asset memory aapl = registry.getAsset(registry.AAPLc());
        assertEq(nvda.feed, registry.NVDAC_FEED());
        assertEq(aapl.feed, registry.AAPLC_FEED());
        assertEq(nvda.decimals, 8);
        assertTrue(nvda.enabled && aapl.enabled);
    }

    function testOwnerCanAddAndDisableFutureAsset() public {
        address asset = address(0xABCD);
        address feed = address(0xDCBA);
        vm.prank(owner);
        registry.registerAsset(asset, feed, 8);
        assertTrue(registry.isRegistered(asset));
        vm.prank(owner);
        registry.setAssetEnabled(asset, false);
        assertFalse(registry.isRegistered(asset));
    }

    function testNonOwnerCannotMutateRegistry() public {
        vm.expectRevert();
        registry.registerAsset(address(0xABCD), address(0xDCBA), 8);
    }
}

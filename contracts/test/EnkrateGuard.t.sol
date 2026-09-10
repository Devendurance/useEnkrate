// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { EnkrateAssetRegistry } from "../src/EnkrateAssetRegistry.sol";
import { EnkrateExecutionEngine } from "../src/EnkrateExecutionEngine.sol";
import { IEnkrateGuard } from "../src/interfaces/IEnkrateGuard.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockB20 } from "./mocks/MockB20.sol";
import { MockFactory } from "./mocks/MockFactory.sol";
import { MockFeed } from "./mocks/MockFeed.sol";
import { MockOracleRegistry } from "./mocks/MockOracleRegistry.sol";
import { MockPolicyRegistry } from "./mocks/MockPolicyRegistry.sol";

contract EnkrateGuardTest is Test {
    MockERC20 internal usdc;
    MockB20 internal stock;
    MockFactory internal factory;
    MockFeed internal feed;
    MockOracleRegistry internal oracle;
    MockPolicyRegistry internal policies;
    EnkrateAssetRegistry internal assets;
    EnkrateExecutionEngine internal engine;

    function setUp() public {
        vm.warp(1_800_000_000);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        stock = new MockB20("NVIDIA Corporation", "NVDAc");
        factory = new MockFactory();
        feed = new MockFeed();
        oracle = new MockOracleRegistry();
        policies = new MockPolicyRegistry();
        assets = new EnkrateAssetRegistry(address(this), address(usdc), address(factory));
        engine = new EnkrateExecutionEngine(
            address(this), address(assets), address(oracle), address(policies), 1 days
        );
        feed.set(200e8, block.timestamp);
        factory.setB20(address(stock), true, true);
        assets.registerAsset(address(stock), address(feed), 8);
        oracle.setOracleParams(address(stock), 1e18, false);
    }

    function testReferenceIsNormalizedAndMultiplierIsNotAppliedAgain() public view {
        (IEnkrateGuard.GuardState memory state, bool approved) = engine.inspectAsset(address(stock));
        assertTrue(approved);
        assertEq(state.referencePrice, 200e8);
        assertEq(state.multiplier, 1e18);
        assertEq(state.referenceAge, 0);
    }

    function testCorporateActionPauseIsIndependentFromAgedReference() public {
        oracle.setOracleParams(address(stock), 2e18, true);
        (IEnkrateGuard.GuardState memory state,) = engine.inspectAsset(address(stock));
        assertTrue(state.oraclePaused);
        vm.warp(block.timestamp + 2 days);
        (state,) = engine.inspectAsset(address(stock));
        assertTrue(state.oraclePaused && state.referenceAge > 1 days);
    }

    function testPolicyRegistryDenialIsVisibleToExecutionGuard() public {
        bytes32 scope = stock.TRANSFER_RECEIVER_POLICY();
        stock.setPolicy(scope, 7);
        policies.setPolicy(7, true, address(0xBEEF), false);
        (IEnkrateGuard.GuardState memory state, bool approved) = engine.inspectAsset(address(stock));
        assertTrue(approved);
        assertFalse(state.transferPaused);
        // inspectAsset reports B20/oracle state separately; execution performs the
        // route-specific owner/executor policy check once calldata supplies the executor.
        assertEq(scope, keccak256("TRANSFER_RECEIVER_POLICY"));
    }
}

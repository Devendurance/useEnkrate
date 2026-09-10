// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { EnkrateAssetRegistry } from "../src/EnkrateAssetRegistry.sol";
import { EnkrateExecutionEngine } from "../src/EnkrateExecutionEngine.sol";
import { IEnkrateExecutionEngine } from "../src/interfaces/IEnkrateExecutionEngine.sol";
import { IEnkrateGuard } from "../src/interfaces/IEnkrateGuard.sol";
import { IAggregationRouterV6 } from "../src/interfaces/IAggregationRouterV6.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockB20 } from "./mocks/MockB20.sol";
import { MockFactory } from "./mocks/MockFactory.sol";
import { MockFeed } from "./mocks/MockFeed.sol";
import { MockOracleRegistry } from "./mocks/MockOracleRegistry.sol";
import { MockPolicyRegistry } from "./mocks/MockPolicyRegistry.sol";
import { MockRouter } from "./mocks/MockRouter.sol";

contract EnkrateExecutionEngineTest is Test {
    uint256 internal constant ONE_USDC = 1e6;
    uint256 internal constant PRICE = 200e8;

    address internal owner = address(0xA11CE);
    address internal keeper = address(0xB0B);
    MockERC20 internal usdc;
    MockB20 internal nvda;
    MockB20 internal aapl;
    MockFactory internal factory;
    MockFeed internal nvdaFeed;
    MockFeed internal aaplFeed;
    MockOracleRegistry internal oracle;
    MockPolicyRegistry internal policies;
    EnkrateAssetRegistry internal registry;
    EnkrateExecutionEngine internal engine;
    MockRouter internal router;

    function setUp() public {
        vm.warp(1_800_000_000);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        nvda = new MockB20("NVIDIA Corporation", "NVDAc");
        aapl = new MockB20("Apple Inc.", "AAPLc");
        factory = new MockFactory();
        nvdaFeed = new MockFeed();
        aaplFeed = new MockFeed();
        oracle = new MockOracleRegistry();
        policies = new MockPolicyRegistry();
        registry = new EnkrateAssetRegistry(owner, address(usdc), address(factory));
        engine = new EnkrateExecutionEngine(
            owner, address(registry), address(oracle), address(policies), 1 days
        );
        router = new MockRouter();

        nvdaFeed.set(int256(PRICE), block.timestamp);
        aaplFeed.set(int256(PRICE), block.timestamp);
        oracle.setOracleParams(address(nvda), 1e18, false);
        oracle.setOracleParams(address(aapl), 1e18, false);
        factory.setB20(address(nvda), true, true);
        factory.setB20(address(aapl), true, true);
        vm.prank(owner);
        registry.registerAsset(address(nvda), address(nvdaFeed), 8);
        vm.prank(owner);
        registry.registerAsset(address(aapl), address(aaplFeed), 8);

        // The production engine's router is immutable. Copy a deterministic mock router's
        // runtime to that official address for isolated unit tests; fork tests use the real code.
        vm.etch(engine.ONE_INCH_ROUTER(), address(router).code);
        MockRouter(engine.ONE_INCH_ROUTER()).configure(500_000);
        nvda.mint(engine.ONE_INCH_ROUTER(), 10_000_000);
        aapl.mint(engine.ONE_INCH_ROUTER(), 10_000_000);
        usdc.mint(owner, 10 * ONE_USDC);
    }

    function _createRecurring(
        address target,
        uint256 amount,
        uint256 maxSpend,
        uint256 interval
    )
        internal
        returns (uint256 id)
    {
        vm.prank(owner);
        id = engine.createRule(
            target,
            amount,
            maxSpend,
            IEnkrateExecutionEngine.RuleType.RECURRING,
            0,
            interval,
            100,
            100,
            block.timestamp + 7 days,
            false
        );
    }

    function _createConditional(uint256 triggerPrice) internal returns (uint256 id) {
        vm.prank(owner);
        id = engine.createRule(
            address(nvda),
            ONE_USDC,
            2 * ONE_USDC,
            IEnkrateExecutionEngine.RuleType.CONDITIONAL_PRICE,
            triggerPrice,
            0,
            100,
            100,
            block.timestamp + 7 days,
            false
        );
    }

    function _calldata(
        address source,
        address target,
        address receiver,
        uint256 amount,
        uint256 minReturn
    )
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeWithSelector(
            bytes4(0x07ed2379),
            address(0x1234),
            IAggregationRouterV6.SwapDescription({
                srcToken: source,
                dstToken: target,
                srcReceiver: address(0x2222),
                dstReceiver: receiver,
                amount: amount,
                minReturnAmount: minReturn,
                flags: 0
            }),
            bytes("")
        );
    }

    function _validCalldata(address target, uint256 minReturn) internal view returns (bytes memory) {
        return _calldata(address(usdc), target, owner, ONE_USDC, minReturn);
    }

    function _approve() internal {
        vm.prank(owner);
        usdc.approve(address(engine), 10 * ONE_USDC);
    }

    function testCreateRecurringAndConditionalRules() public {
        uint256 recurring = _createRecurring(address(nvda), ONE_USDC, 2 * ONE_USDC, 1 days);
        uint256 conditional = _createConditional(PRICE);
        IEnkrateExecutionEngine.Rule memory first = engine.getRule(recurring);
        IEnkrateExecutionEngine.Rule memory second = engine.getRule(conditional);
        assertEq(uint256(first.ruleType), uint256(IEnkrateExecutionEngine.RuleType.RECURRING));
        assertEq(uint256(second.ruleType), uint256(IEnkrateExecutionEngine.RuleType.CONDITIONAL_PRICE));
        assertEq(first.owner, owner);
    }

    function testCancelOnlyOwnerAndCancelledCannotExecute() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 hours);
        vm.prank(keeper);
        vm.expectRevert(EnkrateExecutionEngine.NotRuleOwner.selector);
        engine.cancelRule(id);
        vm.prank(owner);
        engine.cancelRule(id);
        vm.expectRevert(EnkrateExecutionEngine.RuleNotActive.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 495_050));
    }

    function testExpiredRuleCannotExecute() public {
        vm.prank(owner);
        uint256 id = engine.createRule(
            address(nvda),
            ONE_USDC,
            ONE_USDC,
            IEnkrateExecutionEngine.RuleType.RECURRING,
            0,
            1 days,
            100,
            100,
            block.timestamp + 1,
            true
        );
        vm.warp(block.timestamp + 2);
        vm.expectRevert(EnkrateExecutionEngine.RuleExpired.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 1));
    }

    function testIntervalAndSpendWindowEnforced() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 hours);
        _approve();
        engine.executeRule(id, _validCalldata(address(nvda), 495_050));
        vm.expectRevert(EnkrateExecutionEngine.IntervalNotElapsed.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 1));

        vm.warp(block.timestamp + 1 hours + 1);
        // The recurring interval is satisfied but the fixed/tumbling window is not reset yet.
        nvdaFeed.set(int256(PRICE), block.timestamp);
        usdc.mint(owner, ONE_USDC);
        vm.prank(owner);
        usdc.approve(address(engine), 2 * ONE_USDC);
        vm.expectRevert(EnkrateExecutionEngine.SpendLimitExceeded.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 495_050));
        vm.warp(block.timestamp + 24 hours);
        nvdaFeed.set(int256(PRICE), block.timestamp);
        engine.executeRule(id, _validCalldata(address(nvda), 495_050));
        assertEq(engine.getSpendWindow(id).spent, ONE_USDC);
    }

    function testCanAttemptReportsBalanceAndAllowance() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        (bool ok, IEnkrateGuard.ExecutionBlockReason reason,) = engine.canAttemptExecution(id);
        assertFalse(ok);
        assertEq(uint256(reason), uint256(IEnkrateGuard.ExecutionBlockReason.INSUFFICIENT_ALLOWANCE));
        vm.prank(owner);
        usdc.transfer(address(0xCAFE), 10 * ONE_USDC);
        (ok, reason,) = engine.canAttemptExecution(id);
        assertFalse(ok);
        assertEq(uint256(reason), uint256(IEnkrateGuard.ExecutionBlockReason.INSUFFICIENT_BALANCE));
    }

    function testSuccessfulExecutionSettlesDirectlyAndClearsRouterApproval() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        _approve();
        uint256 beforeOwner = nvda.balanceOf(owner);
        engine.executeRule(id, _validCalldata(address(nvda), 495_050));
        assertEq(nvda.balanceOf(owner) - beforeOwner, 500_000);
        assertEq(nvda.balanceOf(address(engine)), 0);
        assertEq(usdc.allowance(address(engine), engine.ONE_INCH_ROUTER()), 0);
        assertEq(usdc.balanceOf(address(engine)), 0);
        assertEq(usdc.balanceOf(owner), 9 * ONE_USDC);
    }

    function testAAPLcAccepted() public {
        uint256 id = _createRecurring(address(aapl), ONE_USDC, ONE_USDC, 1 days);
        _approve();
        engine.executeRule(id, _calldata(address(usdc), address(aapl), owner, ONE_USDC, 495_050));
        assertEq(aapl.balanceOf(owner), 500_000);
    }

    function testUnregisteredAssetRejected() public {
        MockB20 arbitrary = new MockB20("Arbitrary", "NOPE");
        vm.prank(owner);
        vm.expectRevert(EnkrateExecutionEngine.AssetNotApproved.selector);
        engine.createRule(
            address(arbitrary),
            ONE_USDC,
            ONE_USDC,
            IEnkrateExecutionEngine.RuleType.RECURRING,
            0,
            1 days,
            100,
            100,
            block.timestamp + 1 days,
            false
        );
    }

    function testCorporateActionPauseRejected() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        oracle.setOracleParams(address(nvda), 1e18, true);
        _approve();
        vm.expectRevert(EnkrateExecutionEngine.CorporateActionHold.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 1));
    }

    function testAgedReferenceRequiresOptIn() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        vm.warp(block.timestamp + 2 days);
        _approve();
        vm.expectRevert(EnkrateExecutionEngine.ReferenceTooOld.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 1));
    }

    function testTransferPauseRejected() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        nvda.setTransferPaused(true);
        _approve();
        vm.expectRevert(EnkrateExecutionEngine.TransferPaused.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 1));
    }

    function testTransferPolicyDenialRejected() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        bytes32 receiverScope = nvda.TRANSFER_RECEIVER_POLICY();
        nvda.setPolicy(receiverScope, 7);
        policies.setPolicy(7, true, owner, false);
        _approve();
        vm.expectRevert(EnkrateExecutionEngine.B20TransferPolicy.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 495_050));
    }

    function testConditionalRealizedPricePassesAndFailsAtomically() public {
        uint256 passId = _createConditional(PRICE);
        _approve();
        engine.executeRule(passId, _validCalldata(address(nvda), 495_050));
        assertEq(nvda.balanceOf(owner), 500_000);

        uint256 failId = _createConditional(PRICE - 1);
        uint256 ownerBefore = nvda.balanceOf(owner);
        vm.expectRevert(EnkrateExecutionEngine.ConditionalPriceNotMet.selector);
        engine.executeRule(failId, _validCalldata(address(nvda), 495_050));
        assertEq(nvda.balanceOf(owner), ownerBefore);
        assertEq(usdc.balanceOf(address(engine)), 0);
        assertEq(usdc.allowance(address(engine), engine.ONE_INCH_ROUTER()), 0);
    }

    function testInsufficientBalanceAndAllowanceRevert() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        vm.expectRevert(EnkrateExecutionEngine.InsufficientAllowance.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 1));
        vm.prank(owner);
        usdc.approve(address(engine), ONE_USDC);
        vm.prank(owner);
        usdc.transfer(address(0xCAFE), 10 * ONE_USDC);
        vm.expectRevert(EnkrateExecutionEngine.InsufficientBalance.selector);
        engine.executeRule(id, _validCalldata(address(nvda), 1));
    }

    function testReentrancyAttemptFails() public {
        uint256 id = _createRecurring(address(nvda), ONE_USDC, ONE_USDC, 1 days);
        bytes memory route = _validCalldata(address(nvda), 495_050);
        MockRouter(engine.ONE_INCH_ROUTER()).configureReentry(address(engine), id, route);
        _approve();
        vm.expectRevert();
        engine.executeRule(id, route);
        assertEq(usdc.balanceOf(address(engine)), 0);
        assertEq(nvda.balanceOf(address(engine)), 0);
    }
}

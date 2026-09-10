// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { IAggregationRouterV6 } from "../src/interfaces/IAggregationRouterV6.sol";
import { OneInchV6Adapter } from "../src/adapters/OneInchV6Adapter.sol";

contract AdapterCaller {
    function validate(
        bytes calldata data,
        address src,
        address dst,
        address receiver,
        uint256 amount,
        uint256 minOut
    )
        external
        pure
        returns (address executor)
    {
        (executor,,) = OneInchV6Adapter.validate(data, src, dst, receiver, amount, minOut);
    }
}

contract OneInchV6AdapterTest is Test {
    address internal constant USDC = address(0x1111);
    address internal constant NVDA = address(0x2222);
    address internal constant OWNER = address(0x3333);
    uint256 internal constant AMOUNT = 1e6;
    AdapterCaller internal caller;

    function setUp() public {
        caller = new AdapterCaller();
    }

    function _data(
        address src,
        address dst,
        address receiver,
        uint256 amount,
        uint256 minOut,
        uint256 flags
    )
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeWithSelector(
            bytes4(0x07ed2379),
            address(0x4444),
            IAggregationRouterV6.SwapDescription({
                srcToken: src,
                dstToken: dst,
                srcReceiver: address(0x5555),
                dstReceiver: receiver,
                amount: amount,
                minReturnAmount: minOut,
                flags: flags
            }),
            bytes("")
        );
    }

    function testValidGenericSwap() public view {
        assertEq(
            caller.validate(_data(USDC, NVDA, OWNER, AMOUNT, 500_000, 0), USDC, NVDA, OWNER, AMOUNT, 500_000),
            address(0x4444)
        );
    }

    function testRejectsWrongSelector() public {
        bytes memory data = _data(USDC, NVDA, OWNER, AMOUNT, 500_000, 0);
        assembly { mstore(add(data, 32), shl(224, 0xdeadbeef)) }
        vm.expectRevert(OneInchV6Adapter.InvalidSelector.selector);
        caller.validate(data, USDC, NVDA, OWNER, AMOUNT, 500_000);
    }

    function testRejectsWrongSourceDestinationReceiverAndAmount() public {
        vm.expectRevert(OneInchV6Adapter.WrongSourceToken.selector);
        caller.validate(
            _data(address(0x9999), NVDA, OWNER, AMOUNT, 500_000, 0), USDC, NVDA, OWNER, AMOUNT, 500_000
        );
        vm.expectRevert(OneInchV6Adapter.WrongDestinationToken.selector);
        caller.validate(
            _data(USDC, address(0x9999), OWNER, AMOUNT, 500_000, 0), USDC, NVDA, OWNER, AMOUNT, 500_000
        );
        vm.expectRevert(OneInchV6Adapter.WrongDestinationReceiver.selector);
        caller.validate(
            _data(USDC, NVDA, address(0x9999), AMOUNT, 500_000, 0), USDC, NVDA, OWNER, AMOUNT, 500_000
        );
        vm.expectRevert(OneInchV6Adapter.WrongAmount.selector);
        caller.validate(_data(USDC, NVDA, OWNER, AMOUNT + 1, 500_000, 0), USDC, NVDA, OWNER, AMOUNT, 500_000);
    }

    function testRejectsWeakMinimumAndPartialFill() public {
        vm.expectRevert(OneInchV6Adapter.MinimumOutputTooLow.selector);
        caller.validate(_data(USDC, NVDA, OWNER, AMOUNT, 499_999, 0), USDC, NVDA, OWNER, AMOUNT, 500_000);
        vm.expectRevert(OneInchV6Adapter.PartialFillNotAllowed.selector);
        caller.validate(_data(USDC, NVDA, OWNER, AMOUNT, 500_000, 1), USDC, NVDA, OWNER, AMOUNT, 500_000);
    }

    function testRejectsZeroExecutorAndSourceReceiver() public {
        bytes memory zeroExecutor = abi.encodeWithSelector(
            bytes4(0x07ed2379),
            address(0),
            IAggregationRouterV6.SwapDescription({
                srcToken: USDC,
                dstToken: NVDA,
                srcReceiver: address(0x5555),
                dstReceiver: OWNER,
                amount: AMOUNT,
                minReturnAmount: 500_000,
                flags: 0
            }),
            bytes("")
        );
        vm.expectRevert(OneInchV6Adapter.InvalidExecutor.selector);
        caller.validate(zeroExecutor, USDC, NVDA, OWNER, AMOUNT, 500_000);
        bytes memory zeroSourceReceiver = abi.encodeWithSelector(
            bytes4(0x07ed2379),
            address(0x4444),
            IAggregationRouterV6.SwapDescription({
                srcToken: USDC,
                dstToken: NVDA,
                srcReceiver: address(0),
                dstReceiver: OWNER,
                amount: AMOUNT,
                minReturnAmount: 500_000,
                flags: 0
            }),
            bytes("")
        );
        vm.expectRevert(OneInchV6Adapter.InvalidSourceReceiver.selector);
        caller.validate(zeroSourceReceiver, USDC, NVDA, OWNER, AMOUNT, 500_000);
    }
}

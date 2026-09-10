// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Temporary Phase 0B-only harness. This is not the production
/// EnkrateExecutionEngine and must not be used outside a local fork.
contract RouteCallerHarness {
    function approveExact(address token, address spender, uint256 amount) external {
        (bool resetOk, bytes memory resetData) = token.call(
            abi.encodeWithSignature("approve(address,uint256)", spender, 0)
        );
        if (!resetOk) _bubble(resetData);

        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("approve(address,uint256)", spender, amount)
        );
        if (!ok) _bubble(data);
    }

    function execute(address target, bytes calldata data) external returns (bytes memory) {
        (bool ok, bytes memory result) = target.call(data);
        if (!ok) _bubble(result);
        return result;
    }

    function sweep(address token, address recipient, uint256 amount) external {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", recipient, amount)
        );
        if (!ok) _bubble(data);
    }

    function _bubble(bytes memory data) private pure {
        if (data.length == 0) revert("RouteCallerHarness: call failed");
        assembly {
            revert(add(data, 32), mload(data))
        }
    }
}
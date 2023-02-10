// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

pragma abicoder v2;

import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol";

/// @title Router token swapping functionality
/// @notice Functions for swapping tokens via Uniswap V3
interface IUniswapV3Router is IUniswapV3SwapCallback {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWeth {
    function withdraw(uint256 wad) external;
}

interface IUniswapV2Router {
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

contract UniLDO {
    address router2 = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address v2Router = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    address weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    address ldo = 0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32;
    address usdc = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    receive() external payable {}

    constructor() {}

    function swap(uint256 amount) public payable {
        console.log("Amout: ", amount);
        // Swap
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = ldo;
        IUniswapV2Router(v2Router).swapExactETHForTokensSupportingFeeOnTransferTokens{value: amount}(
            0,
            path,
            address(this),
            block.timestamp + 3600
        );

        uint256 ldoBal = IERC20(ldo).balanceOf(address(this));
        console.log("LDO: ", ldoBal);

        IERC20(ldo).approve(router2, ldoBal);

        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: ldo,
            tokenOut: weth,
            fee: uint24(3000),
            recipient: address(this),
            amountIn: ldoBal,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: uint160(0)
        });

        uint256 amountOut = IUniswapV3Router(router2).exactInputSingle(params);
        console.log(amountOut);

        uint256 wethOut = IERC20(weth).balanceOf(address(this));
        console.log("WETH out: ", wethOut);
        IWeth(weth).withdraw(wethOut);

        uint256 swapped = address(this).balance;
        console.log("ETH out: ", swapped);

        params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: weth,
            tokenOut: ldo,
            fee: uint24(3000),
            recipient: address(this),
            amountIn: swapped,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: uint160(0)
        });

        amountOut = IUniswapV3Router(router2).exactInputSingle{value: swapped}(params);
        console.log(amountOut);

        wethOut = IERC20(weth).balanceOf(address(this));
        console.log("WETH out: ", wethOut);
        IWeth(weth).withdraw(wethOut);

        swapped = address(this).balance;
        console.log("ETH out: ", swapped);

        ldoBal = IERC20(ldo).balanceOf(address(this));
        console.log("LDO: ", ldoBal);
    }
}

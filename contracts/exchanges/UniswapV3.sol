// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IUniswapV3Router.sol";
import "../utils/TransferHelper.sol";
import "../interfaces/IRouter.sol";

contract UniswapV3 is IRouter, Ownable {
    using SafeMath for uint256;

    string public constant version = "UniswapV2 1";

    address public weth;

    address public router;

    // Array for path indices
    bytes32[] public pathBytes;

    // Path to index mapping
    mapping(bytes32 => address[]) public paths;

    event AddUniV3Path(bytes32 hash, address[] path);

    event RemoveUniV3Path(bytes32 hash, address[] path);

    constructor(address _router) {
        router = _router;
    }

    /**
        Add univ3 path to list
     */
    function addPath(address[] memory _path) public onlyOwner returns (bytes32) {
        // Generate hash index for path
        bytes32 hash = keccak256(abi.encodePacked(_path));

        // Duplication check
        require(paths[hash].length == 0, "ALREADY_EXIST_PATH");

        // Register path
        pathBytes.push(hash);
        paths[hash] = _path;

        emit AddUniV3Path(hash, _path);

        return hash;
    }

    function getPathIndex(address[] memory _path) public view returns (bytes32) {
        bytes32 hash = keccak256(abi.encodePacked(_path));

        if (paths[hash].length == 0) return 0;
        else return hash;
    }

    /**
        Remove univ2 path from list
     */
    function removePath(bytes32 index) public onlyOwner {
        require(paths[index].length != 0, "NON_EXIST_PATH");

        address[] storage path = paths[index];
        // Delete path record from mapping
        delete paths[index];

        // Remove index in the list
        for (uint256 i = 0; i < pathBytes.length; i++) {
            if (pathBytes[i] == index) {
                pathBytes[i] = pathBytes[pathBytes.length - 1];
                pathBytes.pop();
                break;
            }
        }

        emit RemoveUniV3Path(index, path);
    }

    /**
        Get input token from path
     */
    function pathFrom(bytes32 index) internal view returns (address) {
        return paths[index][0];
    }

    /**
        Get output token from path
     */
    function pathTo(bytes32 index) internal view returns (address) {
        return paths[index][paths[index].length - 1];
    }

    /**
        Uniswap V3 Swap 
     */
    function swap(
        address _from,
        address _to,
        bytes32 _index,
        uint256 _amount
    ) external override {
        // Check Path from and to
        require(pathFrom(_index) == _from, "INVALID_FROM_ADDRESS");
        require(pathTo(_index) == _to, "INVALID_TO_ADDRESS");

        IUniswapV3Router(router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: _from,
                tokenOut: _to,
                fee: 0,
                recipient: address(this),
                deadline: block.timestamp + 3600,
                amountIn: _amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
}

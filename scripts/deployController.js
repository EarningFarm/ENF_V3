const { ethers } = require("hardhat");
const { utils } = require("ethers");

const { curveCRVETH, ethUsdcPath, uniSwapV2Router } = require("../constants/constants");
const constants = require("../constants/constants");

const {
  usdcContract,
  controllerContract,
  curveExchange,
  uniV2Exchange,
  vaultContract,
} = require("../test/externalContracts");

const address = require("./v3_address.json");
const { deployUpgradeable, deployContract } = require("./utils");

const vault = address["ENF Vault address"];
const controller = address["Controller address"];
const exchange = address["Exchange address"];
const curve = address["Curve address"];
const uniV2 = address["Uniswap V2"];
const uniV3 = address["Uniswap V3"];
const balancer = address["Balancer Address"];
const balancerBatch = address["Balancer Batch Address"];
// const cDai = address["CDAI address"];

function toEth(num) {
  return utils.formatEther(num);
}

function toUSDC(num) {
  return utils.formatUnits(num, 6);
}

function fromEth(num) {
  return utils.parseEther(num.toString());
}

function fromUSDC(num) {
  return utils.parseUnits(num.toString(), 6);
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const Controller = await ethers.getContractFactory("Controller")
  const controller = await Controller.deploy()
  console.log("Controller: ", controller.address)
}


main();

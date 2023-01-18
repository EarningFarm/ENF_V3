const { ethers } = require("hardhat");
const fs = require("fs");
const { yellow, cyan } = require("colors");

const { deployContract, deployUpgradeable, verifyContract, verifyUpgradeable } = require("./utils");
const constants = require("../constants/constants");
const { treasury } = require("./config");
const address = require("./address.json");

async function main() {
  const [deployer] = await ethers.getSigners();

  /////////////////////////////////////////
  //             DEPLOYING               //
  /////////////////////////////////////////

  console.log("\nDeploying Contracts\n".yellow);

  // // const tri = "0x0F97afE1aedFc6B89DE66950296E130cA814B010";
  // const cDai = "0xD359D65Cf9Ab8572323Dc8102Ac579baD38AC713";
  // const curve3 = "0xECA1F6Fc9E100585B33392120080e15Ef4Af5c72";

  // const alusd = "0xB9D1dc019FD2f716732E97E2af42D292711BaA01";
  // const lusd = "0x0F97afE1aedFc6B89DE66950296E130cA814B010";
  // const aave = "0x83AAa7c3e8d3Aab641489C1aA6df22878fA93AB2";
  // const compound = "0xBF84828177a6D1c2e14D1469d29d864C6e89AFF7";
  // const tri = "0xBC6394e2f7C11Acdbb99545e46fc6F6878D94827";

  // await verifyUpgradeable(tri);
  const adds = [
    "0x3112b6a416ab8467E8FddA14fb48375f973F16fd",
  ];

  for (let i = 0; i < adds.length; i++) {
    await verifyContract(adds[i], []);
  }
  // await verifyUpgradeable(lusd.address);
  // await verifyUpgradeable(aave.address);
  // await verifyUpgradeable(compound.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const { ethers } = require("hardhat");
const fs = require("fs");
const { yellow, cyan } = require("colors");

const { deployContract, deployUpgradeable, verifyContract, verifyUpgradeable } = require("./utils")
const constants = require("../constants/constants")
const { treasury } = require("./config")

async function main() {
    const [deployer] = await ethers.getSigners();

    /////////////////////////////////////////
    //             DEPLOYING               //
    /////////////////////////////////////////

    console.log("\nDeploying Contracts\n".yellow)

    // Deploying Deposit Approver
    const depositApprover = await deployContract(deployer, "DepositApprover", [constants.usdc])

    // Deploy Vault
    const vault = await deployUpgradeable(deployer, "EFVault", [constants.usdc, "ENF LP", "EMF"])

    // Deploying Controller
    const controller = await deployUpgradeable(deployer, "Controller", [vault.address, constants.usdc, treasury, constants.weth])

    // Deploying Alusd
    const alusd = await deployUpgradeable(deployer, "Alusd", [constants.curveAlusd, constants.alusdLP, controller.address, constants.usdc, constants.convexBooster, constants.alusdPid])

    // Deploying Lusd
    const lusd = await deployUpgradeable(deployer, "Lusd", [constants.curveLusd, constants.lusdLP, controller.address, constants.usdc, constants.convexBooster, constants.lusdPid])

    // Deploying Aave
    const aave = await deployUpgradeable(deployer, "Aave", [constants.curveAave, constants.aaveLP, controller.address, constants.usdc, constants.convexBooster, constants.aavePid])

    // Deploying Compound
    const compound = await deployUpgradeable(deployer, "CompoundV3", [constants.curveCompound, constants.compoundLP, controller.address, constants.usdc, constants.convexBooster, constants.compoundPid])

    // Deploying Tri
    const tri = await deployUpgradeable(deployer, "Tri", [constants.curveTri, constants.triLP, controller.address, constants.usdc, constants.convexBooster, constants.triPid])

    // Deploying Notional
    const cusdc = await deployUpgradeable(deployer, "Cusdc", [constants.usdc, controller.address, constants.notionalProxy, constants.note, constants.nusdc, constants.currencyId])

    // Deploy Exchange
    const exchange = await deployContract(deployer, "Exchange", [constants.weth, controller.address])

    // Deploy Univ2
    const uniV2 = await deployContract(deployer, "UniswapV2", [constants.weth, exchange.address])

    // Deploy UniV3
    const uniV3 = await deployContract(deployer, "UniswapV3", [constants.uniSwapV3Router, exchange.address, constants.weth])

    // Deploy Balancer
    const balancer = await deployContract(deployer, "BalancerV2", [constants.balancerV2Vault, exchange.address, constants.weth])

    // Deploy BalancerBatch
    const balancerBatch = await deployContract(deployer, "BalancerBatchV2", [constants.balancerV2Vault, exchange.address, constants.weth])

    // Deploy Curve
    const curve = await deployContract(deployer, "Curve", [constants.weth, exchange.address])

    ///////////////////////////////////////////
    //           SET CONFIGURATION           //
    ///////////////////////////////////////////

    // Set Vault on Deposit Approver
    await depositApprover.setVault(vault.address)
    console.log("Deposit Approver set Vault")

    await vault.setDepositApprover(depositApprover.address)
    console.log("Vault set Deposit Approver")

    // Set controller to vault
    await vault.setController(controller.address)
    console.log("Controller set vault")

    // Set Exchange to controller
    await controller.setExchange(exchange.address)

    /**
     * Substrategies configuration
     */
    await alusd.setDepositSlippage(100)
    await alusd.setWithdrawSlippage(100)
    await alusd.addRewardToken(constants.crv)
    console.log("ALUSD configuration set")

    await lusd.setDepositSlippage(100)
    await lusd.setWithdrawSlippage(100)
    await lusd.addRewardToken(constants.crv)
    console.log("LUSD configuration set")

    await aave.setDepositSlippage(100)
    await aave.setWithdrawSlippage(100)
    await aave.addRewardToken(constants.crv)
    console.log("AAVE configuration set")

    await compound.setDepositSlippage(100)
    await compound.setWithdrawSlippage(100)
    await compound.addRewardToken(constants.crv)
    console.log("Compound configuration set")

    await tri.setDepositSlippage(100)
    await tri.setWithdrawSlippage(100)
    await tri.addRewardToken(constants.crv)
    console.log("Tri configuration set")

    await cusdc.setDepositSlippage(100)
    await cusdc.setWithdrawSlippage(100)
    console.log("CUSDC configuration set")


    // Set CRV-USDC to exchange
    await uniV2.addPath(
        constants.uniSwapV2Router,
        constants.ethUsdcPath
    )
    console.log("UniV2 add ETH-USDC")

    // Set CRV-USDC to exchange
    await uniV2.addPath(
        constants.uniSwapV2Router,
        constants.crvUsdcPath
    )
    console.log("UniV2 add CRV-USDC")

    // Set CRV-USDC to exchange
    await uniV2.addPath(
        constants.uniSwapV2Router,
        constants.crvEthPath
    )
    console.log("UniV2 add CRV-ETH")

    // Set swaps on Balancer Batch
    await balancerBatch.addPath(constants.balancerNoteToUSDCPools, constants.balancerNoteToUSDCAssets)
    console.log("BalancerBatch set Note-USDC")

    // Set swaps on Balancer
    await balancer.addPath(constants.balancerNoteToETHSwap)
    console.log("Balancer set Note-ETH")
    await balancer.addPath(constants.balancerETHToUSDCSwap)
    console.log("Balancer set ETH-USDC")

    // Set swaps on Univ3

    // Set swaps on Curve
    await curve.addCurvePool(...constants.curveCRVETH)
    console.log("Curve set CRV-ETH")

    // Register Substrategies
    await controller.connect(deployer).registerSubStrategy(alusd.address, 100)
    let totalAlloc = await controller.totalAllocPoint()
    let ssLength = await controller.subStrategyLength()
    console.log(`\tTotal Alloc: ${totalAlloc.toNumber()}, ssLength: ${ssLength.toNumber()}`)

    await controller.connect(deployer).registerSubStrategy(lusd.address, 100)
    totalAlloc = await controller.totalAllocPoint()
    ssLength = await controller.subStrategyLength()
    console.log(`\tTotal Alloc: ${totalAlloc.toNumber()}, ssLength: ${ssLength.toNumber()}`)

    await controller.connect(deployer).registerSubStrategy(aave.address, 100)
    totalAlloc = await controller.totalAllocPoint()
    ssLength = await controller.subStrategyLength()
    console.log(`\tTotal Alloc: ${totalAlloc.toNumber()}, ssLength: ${ssLength.toNumber()}`)

    await controller.connect(deployer).registerSubStrategy(compound.address, 100)
    totalAlloc = await controller.totalAllocPoint()
    ssLength = await controller.subStrategyLength()
    console.log(`\tTotal Alloc: ${totalAlloc.toNumber()}, ssLength: ${ssLength.toNumber()}`)

    await controller.connect(deployer).registerSubStrategy(tri.address, 100)
    totalAlloc = await controller.totalAllocPoint()
    ssLength = await controller.subStrategyLength()
    console.log(`\tTotal Alloc: ${totalAlloc.toNumber()}, ssLength: ${ssLength.toNumber()}`)

    await controller.connect(deployer).registerSubStrategy(cusdc.address, 100)
    totalAlloc = await controller.totalAllocPoint()
    ssLength = await controller.subStrategyLength()
    console.log(`\tTotal Alloc: ${totalAlloc.toNumber()}, ssLength: ${ssLength.toNumber()}`)

    // Output deployed address result
    const deployLog = [
        {
            Label: "DepositApprover address",
            Info: depositApprover.address
        },
        {
            Label: "ENF Vault address",
            Info: vault.address
        },
        {
            Label: "Controller address",
            Info: controller.address
        },
        {
            Label: "Exchange address",
            Info: exchange.address
        },
        {
            Label: "ALUSD address",
            Info: alusd.address
        },
        {
            Label: "LUSD address",
            Info: lusd.address
        },
        {
            Label: "AAVE address",
            Info: aave.address
        },
        {
            Label: "COMPOUND address",
            Info: compound.address
        },
        {
            Label: "TRI address",
            Info: tri.address
        },
        {
            Label: "CUSDC address",
            Info: cusdc.address
        },
        {
            Label: "Uniswap V2",
            Info: uniV2.address
        },
        {
            Label: "Uniswap V3",
            Info: uniV3.address
        },
        {
            Label: "Curve address",
            Info: curve.address
        },
        {
            Label: "Balancer Address",
            Info: balancer.address
        },
        {
            Label: "Balancer Batch Address",
            Info: balancerBatch.address
        }
    ]

    console.table(deployLog)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
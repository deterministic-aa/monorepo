import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "hardhat";
import { createPublicClient, createWalletClient } from "viem";
import {
  getDeterministicAddress,
  getTransferOwnershipCode,
  getCreateAccountSignature,
  SupportedFactory,
} from "@deterministic-aa/utils";

describe("DeterministicAccountFactory.sol", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function fixture() {
    const [deployer, user] = await ethers.getSigners();
    const DeterministicAccountFactory = await ethers.getContractFactory(
      "DeterministicAccountFactory"
    );
    const daFactory = await DeterministicAccountFactory.connect(
      deployer
    ).deploy();
    return { daFactory, deployer, user };
  }

  describe("Deployment", function () {
    describe("getDeterministicAddress()", () => {
      it("should return same offchain predictions for uint256 salt & bytes32 salt", async function () {
        const { daFactory, deployer } = await loadFixture(fixture);
        const salt1 = 1234n;
        const salt2 = "0x04D2";
        const salt3 = "0x0004D2";
        const offchainPrediction1 = getDeterministicAddress({
          factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          securedBy: deployer.address as `0x${string}`,
          salt: salt1,
          daFactory: (await daFactory.getAddress()) as `0x${string}`,
        });
        const offchainPrediction2 = getDeterministicAddress({
          factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          securedBy: deployer.address as `0x${string}`,
          salt: salt2,
          daFactory: (await daFactory.getAddress()) as `0x${string}`,
        });
        const offchainPrediction3 = getDeterministicAddress({
          factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          securedBy: deployer.address as `0x${string}`,
          salt: salt2,
          daFactory: (await daFactory.getAddress()) as `0x${string}`,
        });
        expect(offchainPrediction1).to.equal(offchainPrediction2);
        expect(offchainPrediction1).to.equal(offchainPrediction3);
      });
      it("should return the deterministic address equally onchain and offchain", async function () {
        const { daFactory, deployer } = await loadFixture(fixture);
        const salt = 1234n;
        const offchainPrediction = getDeterministicAddress({
          factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          securedBy: deployer.address as `0x${string}`,
          salt,
          daFactory: (await daFactory.getAddress()) as `0x${string}`,
        });
        const onchainPrediction = await daFactory.getDeterministicAddress(
          SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          deployer.address,
          salt
        );
        expect(offchainPrediction).to.equal(onchainPrediction);
      });
    });

    describe("createAccount()", () => {
      it("Should create a light account and predict address correctly", async function () {
        const { daFactory, deployer, user } = await loadFixture(fixture);
        const salt = "0x987654321";
        const offchainPrediction = getDeterministicAddress({
          factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          securedBy: deployer.address as `0x${string}`,
          salt,
          daFactory: (await daFactory.getAddress()) as `0x${string}`,
        });
        await expect(
          daFactory.connect(deployer).createAccount(
            SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            salt,
            getTransferOwnershipCode({
              factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              owner: user.address as `0x${string}`,
            })
          )
        )
          .to.emit(daFactory, "AccountCreated")
          .withArgs(
            SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            deployer.address,
            offchainPrediction,
            user.address
          );
      });
    });
    describe("createAccountWithSignature()", () => {
      it("Should create a light account and predict address correctly", async function () {
        const { daFactory, deployer, user } = await loadFixture(fixture);
        const salt = "0x987654321";
        const securedBy = deployer.address as `0x${string}`;
        const offchainPrediction = getDeterministicAddress({
          factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          securedBy,
          salt,
          daFactory: (await daFactory.getAddress()) as `0x${string}`,
        });
        const publicClient = await hre.viem.getPublicClient();
        const walletClient = await hre.viem.getWalletClient(securedBy);
        const signature = await getCreateAccountSignature({
          publicClient,
          walletClient,
          factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
          securedBy,
          salt,
          owner: user.address as `0x${string}`,
          daFactory: (await daFactory.getAddress()) as `0x${string}`,
        });
        await expect(
          daFactory.connect(user).createAccountWithSignature(
            SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            salt,
            getTransferOwnershipCode({
              factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              owner: user.address as `0x${string}`,
            }),
            signature
          )
        )
          .to.emit(daFactory, "AccountCreated")
          .withArgs(
            SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            securedBy,
            offchainPrediction,
            user.address
          );
      });
    });
  });
});

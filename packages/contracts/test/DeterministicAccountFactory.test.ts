import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { privateKeyToAddress } from "viem/accounts";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getDeterministicAddress,
  getTransferOwnershipCode,
  getSignatureForSecuredAccount,
  SupportedFactory,
  SignerType,
} from "@deterministic-aa/utils";
import { Address, keccak256 } from "viem";
import { DeterministicAccountSigner__factory } from "../typechain-types";

describe("DeterministicAccountFactory.sol", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function fixture() {
    const [deployer, user, serverAccount] = await ethers.getSigners();
    const DeterministicAccountFactory = await ethers.getContractFactory(
      "DeterministicAccountFactory"
    );
    const DeterministicSignerFactory = await ethers.getContractFactory(
      "DeterministicAccountSignerFactory"
    );

    const daFactory = await DeterministicAccountFactory.connect(
      deployer
    ).deploy();

    const daSignerFactory = await DeterministicSignerFactory.connect(
      deployer
    ).deploy();
    return { daFactory, deployer, user, daSignerFactory, serverAccount };
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
    describe("createSecuredAccount()", () => {
      describe("Sign by DeterministicAccountSigner", async () => {
        it("Should create a light account and predict address correctly", async function () {
          const { daFactory, deployer, user, daSignerFactory, serverAccount } =
            await loadFixture(fixture);
          await daSignerFactory.createDeterministicAccountSigner(
            deployer.address,
            "0x1234"
          );
          const signerContractAddress: Address =
            (await daSignerFactory.getDeterministicAccountSignerAddress(
              deployer.address,
              "0x1234"
            )) as `0x${string}`;
          const signerContract = DeterministicAccountSigner__factory.connect(
            signerContractAddress
          );
          const publicClient = await hre.viem.getPublicClient();
          const timestamp = Math.floor(Date.now() / 1000) + 100;
          await signerContract.connect(deployer).addSigner(serverAccount.address, timestamp);
          const salt = "0x987654321";
          const offchainPrediction = getDeterministicAddress({
            factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            securedBy: signerContractAddress,
            salt,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });

          const serverWalletClient = await hre.viem.getWalletClient(
            serverAccount.address as `0x${string}`
          );
          const signature = await getSignatureForSecuredAccount({
            publicClient,
            factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            securedBy: signerContractAddress,
            signer: {
              type: SignerType.DETERMINISTIC_ACCOUNT_SIGNER,
              signer: serverWalletClient,
              address: serverAccount.address as `0x${string}`,
            },
            salt,
            owner: user.address as `0x${string}`,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          await expect(
            daFactory.connect(user).createSecuredAccount(
              SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              salt,
              signerContractAddress,
              signature,
              getTransferOwnershipCode({
                factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
                owner: user.address as `0x${string}`,
              })
            )
          )
            .to.emit(daFactory, "AccountCreated")
            .withArgs(
              SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              signerContractAddress,
              offchainPrediction,
              user.address
            );
        });
      });
      describe("Sign by EOA", () => {
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
          const signature = await getSignatureForSecuredAccount({
            publicClient,
            signer: {
              type: SignerType.EOA,
              signer: walletClient,
              address: securedBy,
            },
            factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            securedBy,
            salt,
            owner: user.address as `0x${string}`,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          await expect(
            daFactory.connect(user).createSecuredAccount(
              SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              salt,
              securedBy,
              signature,
              getTransferOwnershipCode({
                factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
                owner: user.address as `0x${string}`,
              })
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
      describe("Sign by LightAccount", () => {
        it("Should create a light account and predict address correctly", async function () {
          const { daFactory, deployer, user } = await loadFixture(fixture);
          const MANAGER_ACCOUNT_SALT = "0x1234";
          const signerPrivateKey = keccak256("0x1234");
          const signerAddress = privateKeyToAddress(signerPrivateKey);
          const smartContractAccount = getDeterministicAddress({
            factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            securedBy: deployer.address as `0x${string}`,
            salt: MANAGER_ACCOUNT_SALT,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          await expect(
            daFactory.connect(deployer).createAccount(
              SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              MANAGER_ACCOUNT_SALT,
              getTransferOwnershipCode({
                factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
                owner: signerAddress,
              })
            )
          )
            .to.emit(daFactory, "AccountCreated")
            .withArgs(
              SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              deployer.address,
              smartContractAccount,
              signerAddress
            );
          const salt = "0x987654321";
          const offchainPrediction = getDeterministicAddress({
            factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            securedBy: smartContractAccount,
            salt,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });

          const publicClient = await hre.viem.getPublicClient();
          const signature = await getSignatureForSecuredAccount({
            publicClient,
            factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
            securedBy: smartContractAccount,
            signer: {
              type: SignerType.LIGHT_ACCOUNT,
              address: smartContractAccount,
              privateKey: signerPrivateKey,
            },
            salt,
            owner: user.address as `0x${string}`,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          await expect(
            daFactory.connect(user).createSecuredAccount(
              SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              salt,
              smartContractAccount,
              signature,
              getTransferOwnershipCode({
                factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY,
                owner: user.address as `0x${string}`,
              })
            )
          )
            .to.emit(daFactory, "AccountCreated")
            .withArgs(
              SupportedFactory.LIGHT_ACCOUNT_FACTORY,
              smartContractAccount,
              offchainPrediction,
              user.address
            );
        });
      });
    });
  });
});

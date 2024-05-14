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

const factories = [
  SupportedFactory.LIGHT_ACCOUNT_FACTORY,
  SupportedFactory.MULTI_OWNER_MODULAR_ACCOUNT_FACTORY,
  SupportedFactory.KERNEL_V2_4_FACTORY,
];
const testNames = [
  "Light Account",
  "Multi Owner Modular Account",
  "Kernel v2.4",
];

describe("DeterministicAccountFactory.sol", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function fixture() {
    const [deployer, user, serverAccount] = await ethers.getSigners();
    const DeterministicAccountFactory = await ethers.getContractFactory(
      "DeterministicAccountFactory",
    );
    const DeterministicSignerFactory = await ethers.getContractFactory(
      "DeterministicAccountSignerFactory",
    );

    const daFactory =
      await DeterministicAccountFactory.connect(deployer).deploy();

    const daSignerFactory =
      await DeterministicSignerFactory.connect(deployer).deploy();

    return {
      daFactory,
      deployer,
      user,
      daSignerFactory,
      serverAccount,
    };
  }

  testNames.forEach((testName, index) => {
    const factory = factories[index];
    describe(`${testName} Deployment`, function () {
      describe("getDeterministicAddress()", () => {
        it("should return same offchain predictions for uint256 salt & bytes32 salt", async function () {
          const { daFactory, deployer } = await loadFixture(fixture);
          const salt1 = 1234n;
          const salt2 = "0x04D2";
          const salt3 = "0x0004D2";
          const offchainPrediction1 = getDeterministicAddress({
            factory: factory,
            securedBy: deployer.address as `0x${string}`,
            salt: salt1,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          const offchainPrediction2 = getDeterministicAddress({
            factory: factory,
            securedBy: deployer.address as `0x${string}`,
            salt: salt2,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          const offchainPrediction3 = getDeterministicAddress({
            factory: factory,
            securedBy: deployer.address as `0x${string}`,
            salt: salt3,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          expect(offchainPrediction1).to.equal(offchainPrediction2);
          expect(offchainPrediction1).to.equal(offchainPrediction3);
        });
        it("should return the deterministic address equally onchain and offchain", async function () {
          const { daFactory, deployer } = await loadFixture(fixture);
          const salt = 1234n;
          const offchainPrediction = getDeterministicAddress({
            factory: factory,
            securedBy: deployer.address as `0x${string}`,
            salt,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          const onchainPrediction = await daFactory.getDeterministicAddress(
            factory,
            deployer.address,
            salt,
          );
          expect(offchainPrediction).to.equal(onchainPrediction);
        });
      });

      describe("createAccount()", async () => {
        it("Should create an account and predict address correctly", async function () {
          const { daFactory, deployer, user } = await loadFixture(fixture);

          const salt = "0x987654321";
          const offchainPrediction = getDeterministicAddress({
            factory,
            securedBy: deployer.address as `0x${string}`,
            salt,
            daFactory: (await daFactory.getAddress()) as `0x${string}`,
          });
          await expect(
            daFactory.connect(deployer).createAccount(
              factory,
              salt,
              getTransferOwnershipCode({
                factory,
                owner: user.address as `0x${string}`,
                daFactory: (await daFactory.getAddress()) as `0x${string}`,
              }),
            ),
          )
            .to.emit(daFactory, "AccountCreated")
            .withArgs(
              factory,
              deployer.address,
              offchainPrediction,
              user.address,
            );
        });
      });
      describe("createSecuredAccount()", () => {
        describe("Sign by DeterministicAccountSigner", async () => {
          it("Should create an account and predict address correctly", async function () {
            const {
              daFactory,
              deployer,
              user,
              daSignerFactory,
              serverAccount,
            } = await loadFixture(fixture);
            await daSignerFactory.createDeterministicAccountSigner(
              deployer.address,
              "0x1234",
            );
            const signerContractAddress: Address =
              (await daSignerFactory.getDeterministicAccountSignerAddress(
                deployer.address,
                "0x1234",
              )) as `0x${string}`;
            const signerContract = DeterministicAccountSigner__factory.connect(
              signerContractAddress,
            );
            const publicClient = await hre.viem.getPublicClient();
            const timestamp = Math.floor(Date.now() / 1000) + 100;
            await signerContract
              .connect(deployer)
              .addSigner(serverAccount.address, timestamp);
            const salt = "0x987654321";
            const offchainPrediction = getDeterministicAddress({
              factory: factory,
              securedBy: signerContractAddress,
              salt,
              daFactory: (await daFactory.getAddress()) as `0x${string}`,
            });

            const serverWalletClient = await hre.viem.getWalletClient(
              serverAccount.address as `0x${string}`,
            );
            const signature = await getSignatureForSecuredAccount({
              publicClient,
              factory: factory,
              securedBy: {
                address: signerContractAddress,
                type: SignerType.DETERMINISTIC_ACCOUNT_SIGNER,
                signer: serverWalletClient,
                signerAddress: serverAccount.address as `0x${string}`,
              },
              salt,
              owner: user.address as `0x${string}`,
              daFactory: (await daFactory.getAddress()) as `0x${string}`,
            });
            await expect(
              daFactory.connect(user).createSecuredAccount(
                factory,
                salt,
                signerContractAddress,
                signature,
                getTransferOwnershipCode({
                  factory: factory,
                  owner: user.address as `0x${string}`,
                  daFactory: (await daFactory.getAddress()) as `0x${string}`,
                }),
              ),
            )
              .to.emit(daFactory, "AccountCreated")
              .withArgs(
                factory,
                signerContractAddress,
                offchainPrediction,
                user.address,
              );
          });
        });
        describe("Sign by EOA", () => {
          it("Should create a light account and predict address correctly", async function () {
            const { daFactory, deployer, user } = await loadFixture(fixture);
            const salt = "0x987654321";
            const securedBy = deployer.address as `0x${string}`;
            const offchainPrediction = getDeterministicAddress({
              factory,
              securedBy,
              salt,
              daFactory: (await daFactory.getAddress()) as `0x${string}`,
            });
            const publicClient = await hre.viem.getPublicClient();
            const walletClient = await hre.viem.getWalletClient(securedBy);
            const signature = await getSignatureForSecuredAccount({
              publicClient,
              factory,
              securedBy: {
                address: securedBy,
                type: SignerType.EOA,
                signer: walletClient,
              },
              salt,
              owner: user.address as `0x${string}`,
              daFactory: (await daFactory.getAddress()) as `0x${string}`,
            });
            await expect(
              daFactory.connect(user).createSecuredAccount(
                factory,
                salt,
                securedBy,
                signature,
                getTransferOwnershipCode({
                  factory,
                  owner: user.address as `0x${string}`,
                  daFactory: (await daFactory.getAddress()) as `0x${string}`,
                }),
              ),
            )
              .to.emit(daFactory, "AccountCreated")
              .withArgs(factory, securedBy, offchainPrediction, user.address);
          });
        });
        describe("Sign by LightAccount", () => {
          it("Should create an account and predict address correctly", async function () {
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
                  daFactory: (await daFactory.getAddress()) as `0x${string}`,
                }),
              ),
            )
              .to.emit(daFactory, "AccountCreated")
              .withArgs(
                SupportedFactory.LIGHT_ACCOUNT_FACTORY,
                deployer.address,
                smartContractAccount,
                signerAddress,
              );
            const salt = "0x987654321";
            const offchainPrediction = getDeterministicAddress({
              factory,
              securedBy: smartContractAccount,
              salt,
              daFactory: (await daFactory.getAddress()) as `0x${string}`,
            });

            const publicClient = await hre.viem.getPublicClient();
            const signature = await getSignatureForSecuredAccount({
              publicClient,
              factory,
              securedBy: {
                type: SignerType.LIGHT_ACCOUNT,
                address: smartContractAccount,
                signerAddress,
                signerPrivateKey,
              },
              salt,
              owner: user.address as `0x${string}`,
              daFactory: (await daFactory.getAddress()) as `0x${string}`,
            });
            await expect(
              daFactory.connect(user).createSecuredAccount(
                factory,
                salt,
                smartContractAccount,
                signature,
                getTransferOwnershipCode({
                  factory,
                  owner: user.address as `0x${string}`,
                  daFactory: (await daFactory.getAddress()) as `0x${string}`,
                }),
              ),
            )
              .to.emit(daFactory, "AccountCreated")
              .withArgs(
                factory,
                smartContractAccount,
                offchainPrediction,
                user.address,
              );
          });
        });
      });
    });
  });
});

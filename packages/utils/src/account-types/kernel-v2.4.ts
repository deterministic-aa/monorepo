import {
  Address,
  Hex,
  encodeFunctionData,
  encodePacked,
  getCreate2Address,
  keccak256,
  maxUint96,
  numberToHex,
} from "viem";
import { SupportedFactory } from "../supported-factories";
import { DETERMINISTIC_AA_V010 } from "../constants";

const abi = [
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_defaultValidator",
        type: "address",
        internalType: "contract IKernelValidator",
      },
      { name: "_data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "data", type: "bytes", internalType: "bytes" },
      { name: "_operation", type: "uint8", internalType: "enum Operation" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "enable",
    inputs: [{ name: "_data", type: "bytes", internalType: "bytes" }],
    outputs: [],
    stateMutability: "payable",
  },
];

const ECDSA_VALIDATOR = "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390";

export const getKernelAddress = (salt: Hex, daFactory?: Address) => {
  const PROXY_CREATION_CODE =
    "0x607f3d8160093d39f33d3d33735de4839a76cf55d0c90e2061ef4386d962e15ae314605757363d3d37363d7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc545af43d6000803e6052573d6000fd5b3d6000f35b3d356020355560408036111560525736038060403d373d3d355af43d6000803e6052573d6000fd00";

  const initData = encodeFunctionData({
    abi,
    functionName: "initialize",
    args: [
      ECDSA_VALIDATOR,
      encodePacked(["address"], [daFactory || DETERMINISTIC_AA_V010]),
    ],
  });

  // Kernel salt:
  //   bytes32 salt = bytes32(uint256(keccak256(abi.encodePacked(_data, _index))) & type(uint96).max);
  //   - _data: initData
  //   - _index: salt
  const combinedSalt = numberToHex(
    BigInt(
      keccak256(encodePacked(["bytes", "uint256"], [initData, BigInt(salt)])),
    ) & maxUint96,
    {
      size: 32,
    },
  );

  const address = getCreate2Address({
    from: SupportedFactory.KERNEL_V2_4_FACTORY,
    salt: combinedSalt,
    bytecodeHash: keccak256(PROXY_CREATION_CODE),
  });
  return address;
};

export const getKernelTransferOwnershipCode = (owner: Address) => {
  return encodeFunctionData({
    abi,
    functionName: "execute",
    args: [
      ECDSA_VALIDATOR,
      0, // value
      encodeFunctionData({
        abi,
        functionName: "enable",
        args: [encodePacked(["address"], [owner])],
      }),
      0, // Operation.Call
    ],
  });
};

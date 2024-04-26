import {
  Address,
  Hex,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getCreate2Address,
  keccak256,
} from "viem";
import { SupportedFactory } from "../supported-factories";
import { DETERMINISTIC_AA_V010 } from "../constants";

const abi = [
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "plugins", type: "address[]", internalType: "address[]" },
      { name: "pluginInitData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "MULTI_OWNER_PLUGIN",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMessageHash",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "message", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
];

const pluginAbi = [
  {
    type: "function",
    name: "updateOwners",
    inputs: [
      { name: "ownersToAdd", type: "address[]", internalType: "address[]" },
      { name: "ownersToRemove", type: "address[]", internalType: "address[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "ownersOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view",
  },
];

export const getMultiOwnerModularAccount = (salt: Hex, daFactory?: Address) => {
  const PROXY_CREATION_CODE =
    "0x60406080815261042c908138038061001681610218565b93843982019181818403126102135780516001600160a01b038116808203610213576020838101516001600160401b0394919391858211610213570186601f820112156102135780519061007161006c83610253565b610218565b918083528583019886828401011161021357888661008f930161026e565b813b156101b9577f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b031916841790556000927fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b8480a28051158015906101b2575b61010b575b855160e790816103458239f35b855194606086019081118682101761019e578697849283926101889952602788527f416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c87890152660819985a5b195960ca1b8a8901525190845af4913d15610194573d9061017a61006c83610253565b91825281943d92013e610291565b508038808080806100fe565b5060609250610291565b634e487b7160e01b84526041600452602484fd5b50826100f9565b855162461bcd60e51b815260048101859052602d60248201527f455243313936373a206e657720696d706c656d656e746174696f6e206973206e60448201526c1bdd08184818dbdb9d1c9858dd609a1b6064820152608490fd5b600080fd5b6040519190601f01601f191682016001600160401b0381118382101761023d57604052565b634e487b7160e01b600052604160045260246000fd5b6001600160401b03811161023d57601f01601f191660200190565b60005b8381106102815750506000910152565b8181015183820152602001610271565b919290156102f357508151156102a5575090565b3b156102ae5790565b60405162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e74726163740000006044820152606490fd5b8251909150156103065750805190602001fd5b6044604051809262461bcd60e51b825260206004830152610336815180928160248601526020868601910161026e565b601f01601f19168101030190fdfe60806040523615605f5773ffffffffffffffffffffffffffffffffffffffff7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc54166000808092368280378136915af43d82803e15605b573d90f35b3d90fd5b73ffffffffffffffffffffffffffffffffffffffff7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc54166000808092368280378136915af43d82803e15605b573d90f3fea26469706673582212208f3104255ee3c201238ea03e118ee6ec0a2cff51cbfbdc3af1727982a5a959a564736f6c63430008160033";
  const bytecode = encodePacked(
    ["bytes", "bytes"],
    [PROXY_CREATION_CODE, encodeAbiParameters(
      [{ type: "address" }, { type: "string" }],
      ["0x0046000000000151008789797b54fdb500E2a61e", ""],
    )],
  );

  const combinedSalt = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [
        salt,
        encodeAbiParameters(
          [{ type: "address[]" }],
          [[daFactory || DETERMINISTIC_AA_V010]],
        ),
      ],
    ),
  );

  const address = getCreate2Address({
    from: SupportedFactory.MULTI_OWNER_MODULAR_ACCOUNT_FACTORY,
    salt: combinedSalt,
    bytecodeHash: keccak256(bytecode),
  });
  return address;
};

export const getMultiOwnerModularAccountTransferOwnershipCode = (
  ownersToAdd: [Address],
  ownersToRemove: [Address],
) => {
  return encodeFunctionData({
    abi: pluginAbi,
    functionName: "updateOwners",
    args: [ownersToAdd, ownersToRemove],
  });
};

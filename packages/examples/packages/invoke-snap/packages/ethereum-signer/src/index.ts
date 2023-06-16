import { rpcErrors } from '@metamask/rpc-errors';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { assert, stringToBytes } from '@metamask/utils';
import { sha256 } from '@noble/hashes/sha256';

import { BIP44Path, SignMessageParams } from './types';

const CORE_SIGNER_SNAP_ID = 'npm:@metamask/core-signer-example-snap';
const DEFAULT_DERIVATION_PATH: BIP44Path = [
  `bip32:44'`,
  `bip32:1'`,
  `bip32:0'`,
  'bip32:0',
  'bip32:0',
];

/**
 * Handle incoming JSON-RPC requests from the dapp, sent through the
 * `wallet_invokeSnap` method. This handler handles a single method:
 *
 * - `signMessage`: Get an account from the core signer snap, and sign a
 * message with it. This snap does not do the signing itself, but rather invokes
 * the core signer snap to do it.
 *
 * @param params - The request parameters.
 * @param params.request - The JSON-RPC request object.
 * @returns The JSON-RPC response.
 * @see https://docs.metamask.io/snaps/reference/exports/#onrpcrequest
 * @see https://docs.metamask.io/snaps/reference/rpc-api/#wallet_invokesnap
 * @see https://docs.metamask.io/snaps/reference/rpc-api/#snap_getentropy
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ request }) => {
  switch (request.method) {
    case 'signMessage': {
      const { message, path = DEFAULT_DERIVATION_PATH } =
        request.params as unknown as SignMessageParams;

      assert(
        path[1] === `bip32:1'`,
        rpcErrors.invalidParams({
          message:
            "This snap only supports the Bitcoin mainnet. Please use the `bip32:1'` coin type.",
        }),
      );

      const account = await snap.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: CORE_SIGNER_SNAP_ID,
          request: {
            method: 'getAccount',
            params: {
              path,
            },
          },
        },
      });

      return await snap.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: CORE_SIGNER_SNAP_ID,
          request: {
            method: 'signMessage',
            params: {
              // To keep this example simple, we only support signing messages
              // with the SHA-256 hash function. In a real snap, you could also
              // sign actual transactions.
              message: sha256(stringToBytes(message)),
              account,
            },
          },
        },
      });
    }

    default:
      throw rpcErrors.methodNotFound({
        data: { method: request.method },
      });
  }
};

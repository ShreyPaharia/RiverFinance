import assert from 'assert';
import { createHash } from 'crypto';

import {
  AccountInfo,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import * as BufferLayout from 'buffer-layout';
import * as Layout from './layout';

import { HASH_PREFIX, NAME_PROGRAM_ID } from './bindings';
import { NameRegistryState } from './state';

export class Numberu32 extends BN {
  /**
   * Convert to Buffer representation
   */
  toBuffer(): Buffer {
    const a = super.toArray().reverse();
    const b = Buffer.from(a);
    if (b.length === 4) {
      return b;
    }
    assert(b.length < 4, 'Numberu32 too large');

    const zeroPad = Buffer.alloc(4);
    b.copy(zeroPad);
    return zeroPad;
  }

  /**
   * Construct a Numberu64 from Buffer representation
   */
  static fromBuffer(buffer: any): BN {
    assert(buffer.length === 4, `Invalid buffer length: ${buffer.length}`);
    return new BN(
      [...buffer]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(''),
      16
    );
  }
}

export class Numberu64 extends BN {
  /**
   * Convert to Buffer representation
   */
  toBuffer(): Buffer {
    const a = super.toArray().reverse();
    const b = Buffer.from(a);
    if (b.length === 8) {
      return b;
    }
    assert(b.length < 8, 'Numberu64 too large');

    const zeroPad = Buffer.alloc(8);
    b.copy(zeroPad);
    return zeroPad;
  }

  /**
   * Construct a Numberu64 from Buffer representation
   */
  static fromBuffer(buffer: any): BN {
    assert(buffer.length === 8, `Invalid buffer length: ${buffer.length}`);
    return new BN(
      [...buffer]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(''),
      16
    );
  }
}

export const signAndSendTransactionInstructions = async (
  // sign and send transaction
  connection: Connection,
  signers: Array<Keypair>,
  feePayer: Keypair,
  txInstructions: Array<TransactionInstruction>
): Promise<string> => {
  const tx = new Transaction();
  tx.feePayer = feePayer.publicKey;
  signers.push(feePayer);
  tx.add(...txInstructions);
  return await connection.sendTransaction(tx, signers);
};

export async function getHashedName(name: string): Promise<Buffer> {
  const input = HASH_PREFIX + name;
  const buffer = createHash('sha256').update(input, 'utf8').digest();
  return buffer;
}

export async function getNameAccountKey(
  hashed_name: Buffer,
  nameClass?: PublicKey,
  nameParent?: PublicKey
): Promise<PublicKey> {
  const seeds = [hashed_name];
  if (nameClass) {
    seeds.push(nameClass.toBuffer());
  } else {
    seeds.push(Buffer.alloc(32));
  }
  if (nameParent) {
    seeds.push(nameParent.toBuffer());
  } else {
    seeds.push(Buffer.alloc(32));
  }
  const [nameAccountKey] = await PublicKey.findProgramAddress(
    seeds,
    NAME_PROGRAM_ID
  );
  return nameAccountKey;
}

export async function getNameOwner(
  connection: Connection,
  nameAccountKey: PublicKey
): Promise<NameRegistryState> {
  const nameAccount = await connection.getAccountInfo(nameAccountKey);
  if (!nameAccount) {
    throw new Error('Unable to find the given account.');
  }
  return NameRegistryState.retrieve(connection, nameAccountKey);
}

//Taken from Serum
export async function getFilteredProgramAccounts(
  connection: Connection,
  programId: PublicKey,
  filters: any
): Promise<{ publicKey: PublicKey; accountInfo: AccountInfo<Buffer> }[]> {
  const resp = await connection.getProgramAccounts(programId, {
    commitment: connection.commitment,
    filters,
    encoding: 'base64',
  });
  return resp.map(
    ({ pubkey, account: { data, executable, owner, lamports } }) => ({
      publicKey: pubkey,
      accountInfo: {
        data: data,
        executable,
        owner: owner,
        lamports,
      },
    })
  );
}

export const CurveType = Object.freeze({
  ConstantProduct: 0, // Constant product curve, Uniswap-style
  ConstantPrice: 1, // Constant price curve, always X amount of A token for 1 B token, where X is defined at init
  Offset: 3, // Offset curve, like Uniswap, but with an additional offset on the token B side
});


export const TokenStreamLayout = BufferLayout.struct([
  BufferLayout.u8('version'),
  BufferLayout.u8('isInitialized'),
  BufferLayout.u8('nonce'),
  Layout.publicKey('tokenProgramId'),
  Layout.publicKey('tokenAccountA'),
  Layout.publicKey('tokenAccountB'),
  Layout.publicKey('tokenPool'),
  Layout.publicKey('mintA'),
  Layout.publicKey('mintB'),
  Layout.publicKey('feeAccount'),
  Layout.uint64('tradeFeeNumerator'),
  Layout.uint64('tradeFeeDenominator'),
  Layout.uint64('ownerTradeFeeNumerator'),
  Layout.uint64('ownerTradeFeeDenominator'),
  Layout.uint64('ownerWithdrawFeeNumerator'),
  Layout.uint64('ownerWithdrawFeeDenominator'),
  Layout.uint64('hostFeeNumerator'),
  Layout.uint64('hostFeeDenominator'),
  BufferLayout.u8('curveType'),
  BufferLayout.blob(32, 'curveParameters'),
]);

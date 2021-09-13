import assert from 'assert';
import BN from 'bn.js';
import {Buffer} from 'buffer';
import * as BufferLayout from 'buffer-layout';
import type {Connection, Signer, TransactionSignature} from '@solana/web3.js';
import {
  Account,
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
  TransactionInstruction,
} from '@solana/web3.js';
import { Token } from '@solana/spl-token';

import * as Layout from './layout';
import {sendAndConfirmTransaction} from './util/send-and-confirm-transaction';
import {loadAccount} from './util/account';

// export const TOKEN_SWAP_PROGRAM_ID: PublicKey = new PublicKey(
//   'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8',
// );
// export const TOKEN_SWAP_PROGRAM_ID: PublicKey = new PublicKey(
//   '7FvKJFsrz7eVGd9r5S2PkYXqNhGLp4hEwpFLYhhedvqn',
// );
export const TOKEN_SWAP_PROGRAM_ID: PublicKey = new PublicKey(
  'AQ5Pyb28e6rLJLLVnUCJhFxNwMyAf9kFSZ5Dvg45QGev',
);
// export const TOKEN_SWAP_PROGRAM_ID: PublicKey = new PublicKey(
//   'CsQ9XrpvUsmMXKNmMxbeXn7UAqy8Wba7Vta3vJxho1kd',
// );


/**
 * Some amount of tokens
 */
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
  static fromBuffer(buffer: Buffer): Numberu64 {
    assert(buffer.length === 8, `Invalid buffer length: ${buffer.length}`);
    return new Numberu64(
      [...buffer]
        .reverse()
        .map(i => `00${i.toString(16)}`.slice(-2))
        .join(''),
      16,
    );
  }
}

export const TokenSwapLayout = BufferLayout.struct([
  BufferLayout.u8('version'),
  BufferLayout.u8('isInitialized'),
  BufferLayout.u8('nonce'),
  Layout.publicKey('tokenProgramId'),
  Layout.publicKey('tokenAccountA'),
  Layout.publicKey('tokenSwap'),
  Layout.publicKey('tokenPool'),
  Layout.publicKey('mintA'),
  Layout.publicKey('authority'),
  Layout.publicKey('feeAccount'),
]);

// this.tokenSwap = tokenSwap;
// this.authority = authority;


export const TokenStreamLayout = BufferLayout.struct([

  BufferLayout.u8('version'),
  BufferLayout.u8('isInitialized'),
  BufferLayout.u8('nonce'),
  Layout.publicKey('tokenProgramId'),
  Layout.publicKey('tokenAccountA'),
  Layout.publicKey('tokenSwap'),
  Layout.publicKey('tokenPool'),
  Layout.publicKey('mintA'),
  Layout.publicKey('authority'),
  Layout.publicKey('feeAccount'),

]);

export const TokenStreamAggrementLayout = BufferLayout.struct([
  // BufferLayout.u8('version'),
  BufferLayout.u8('isInitialized'),
  BufferLayout.u8('agreementLength'),
  BufferLayout.blob(32, 'stream_balance'),
  BufferLayout.blob(720, 'agreements'),
  Layout.publicKey('stream_token_info_account'),
]);

export const CurveType = Object.freeze({
  ConstantProduct: 0, // Constant product curve, Uniswap-style
  ConstantPrice: 1, // Constant price curve, always X amount of A token for 1 B token, where X is defined at init
  Offset: 3, // Offset curve, like Uniswap, but with an additional offset on the token B side
});

/**
 * A program to exchange tokens against a pool of liquidity
 */
export class TokenSwap {
  /**
   * Create a Token object attached to the specific token
   *
   * @param connection The connection to use
   * @param tokenSwap The token swap account
   * @param swapProgramId The program ID of the token-swap program
   * @param tokenProgramId The program ID of the token program
   * @param poolToken The pool token
   * @param authority The authority over the swap and accounts
   * @param tokenAccountA The token swap's Token A account
  //  * @param tokenAccountB The token swap's Token B account
   * @param mintA The mint of Token A
   * @param payer Pays for the transaction
   */
  constructor(
    private connection: Connection,
    public tokenSwapAccount: Account,
    public tokenSwap: PublicKey,
    public swapProgramId: PublicKey,
    public tokenProgramId: PublicKey,
    public poolToken: PublicKey,
    public feeAccount: PublicKey,
    public authority: PublicKey,
    public tokenAccountA: PublicKey,
    // public tokenAccountB: PublicKey,
    public mintA: PublicKey,
    // public mintB: PublicKey,
    public payer: Account,
  ) {
    this.connection = connection;
    this.tokenSwapAccount = tokenSwapAccount;
    this.tokenSwap = tokenSwap;
    this.swapProgramId = swapProgramId;
    this.tokenProgramId = tokenProgramId;
    this.poolToken = poolToken;
    this.feeAccount = feeAccount;
    this.authority = authority;
    this.tokenAccountA = tokenAccountA;
    // this.tokenAccountB = tokenAccountB;
    this.mintA = mintA;
    // this.mintB = mintB;
    this.payer = payer;
  }

  /**
   * Get the minimum balance for the token swap account to be rent exempt
   *
   * @return Number of lamports required
   */
  static async getMinBalanceRentForExemptTokenSwap(
    connection: Connection,
  ): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(
      TokenSwapLayout.span,
    );
  }

  static createInitSwapInstruction(
    tokenSwapAccount: Account,
    authority: PublicKey,
    tokenAccountA: PublicKey,
    // tokenAccountB: PublicKey,
    tokenPool: PublicKey,
    feeAccount: PublicKey,
    tokenAccountPool: PublicKey,
    tokenProgramId: PublicKey,
    swapProgramId: PublicKey,
    nonce: number,
  ): TransactionInstruction {
    console.log(" tokenProgramId ", tokenProgramId);

    const keys = [
      {pubkey: tokenSwapAccount.publicKey, isSigner: false, isWritable: true},
      {pubkey: authority, isSigner: false, isWritable: false},
      {pubkey: tokenAccountA, isSigner: false, isWritable: false},
      // {pubkey: tokenAccountB, isSigner: false, isWritable: false},
      {pubkey: tokenPool, isSigner: false, isWritable: true},
      {pubkey: feeAccount, isSigner: false, isWritable: false},
      {pubkey: tokenAccountPool, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    ];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.u8('nonce'),
    ]);
    let data = Buffer.alloc(16);

    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: 0, // InitializeSwap instruction
          nonce,
        },
        data,
      );
      data = data.slice(0, encodeLength);
    }
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }

  static async loadTokenSwap(
    connection: Connection,
    tokenSwapAccount:Account,
    address: PublicKey,
    programId: PublicKey,
    payer: Account,
  ): Promise<TokenSwap> {
    const data = await loadAccount(connection, address, programId);
    const tokenSwapData = TokenSwapLayout.decode(data);
    console.log(" tokenSwapData ", tokenSwapData);
    if (!tokenSwapData.isInitialized) {
      throw new Error(`Invalid token swap state`);
    }

    const [authority] = await PublicKey.findProgramAddress(
      [address.toBuffer()],
      programId,
    );

    const poolToken = new PublicKey(tokenSwapData.tokenPool);
    const feeAccount = new PublicKey(tokenSwapData.feeAccount);
    const tokenAccountA = new PublicKey(tokenSwapData.tokenAccountA);
    // const tokenAccountB = new PublicKey(tokenSwapData.tokenAccountB);
    const mintA = new PublicKey(tokenSwapData.mintA);
    // const mintB = new PublicKey(tokenSwapData.mintB);
    const tokenProgramId = new PublicKey(tokenSwapData.tokenProgramId);

    return new TokenSwap(
      connection,
      tokenSwapAccount,
      address,
      programId,
      tokenProgramId,
      poolToken,
      feeAccount,
      authority,
      tokenAccountA,
      // tokenAccountB,
      mintA,
      // mintB,
      payer,
    );
  }

  /**
   * Create a new Token Swap
   *
   * @param connection The connection to use
   * @param payer Pays for the transaction
   * @param tokenSwapAccount The token swap account
   * @param authority The authority over the swap and accounts
   * @param nonce The nonce used to generate the authority
   * @param tokenAccountA: The token swap's Token A account
   * @param tokenAccountB: The token swap's Token B account
   * @param poolToken The pool token
   * @param tokenAccountPool The token swap's pool token account
   * @param tokenProgramId The program ID of the token program
   * @param swapProgramId The program ID of the token-swap program
   * @param feeNumerator Numerator of the fee ratio
   * @param feeDenominator Denominator of the fee ratio
   * @return Token object for the newly minted token, Public key of the account holding the total supply of new tokens
   */
  static async createTokenSwap(
    connection: Connection,
    payer: Account,
    tokenSwapAccount: Account,
    authority: PublicKey,
    tokenAccountA: PublicKey,
    // tokenAccountB: PublicKey,
    poolToken: PublicKey,
    mintA: PublicKey,
    // mintB: PublicKey,
    feeAccount: PublicKey,
    tokenAccountPool: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    nonce: number,
  ): Promise<TokenSwap> {
    let transaction;
    const tokenSwap = new TokenSwap(
      connection,
      tokenSwapAccount,
      tokenSwapAccount.publicKey,
      swapProgramId,
      tokenProgramId,
      poolToken,
      feeAccount,
      authority,
      tokenAccountA,
      // tokenAccountB,
      mintA,
      // mintB,
      payer,
    );

    // Allocate memory for the account
    const balanceNeeded = await TokenSwap.getMinBalanceRentForExemptTokenSwap(
      connection,
    );
    transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenSwapAccount.publicKey,
        lamports: balanceNeeded,
        space: TokenSwapLayout.span,
        programId: swapProgramId,
      }),
    );

    const instruction = TokenSwap.createInitSwapInstruction(
      tokenSwapAccount,
      authority,
      tokenAccountA,
      // tokenAccountB,
      poolToken,
      feeAccount,
      tokenAccountPool,
      tokenProgramId,
      swapProgramId,
      nonce,
    );

    transaction.add(instruction);
    await sendAndConfirmTransaction(
      'createAccount and InitializeSwap',
      connection,
      transaction,
      payer,
      tokenSwapAccount,
    );

    return tokenSwap;
  }

  /**
   * Swap token A for token B
   *
   * @param userSource User's source token account
   * @param poolSource Pool's source token account
   * @param poolDestination Pool's destination token account
   * @param userDestination User's destination token account
   * @param hostFeeAccount Host account to gather fees
   * @param userTransferAuthority Account delegated to transfer user's tokens
   * @param amountIn Amount to transfer from source account
   * @param minimumAmountOut Minimum amount of tokens the user will receive
   */
  async swap(
    userSource: PublicKey,
    poolSource: PublicKey,
    poolDestination: PublicKey,
    userDestination: PublicKey,
    hostFeeAccount: PublicKey | null,
    userTransferAuthority: Account,
    amountIn: number | Numberu64,
    minimumAmountOut: number | Numberu64,
  ): Promise<TransactionSignature> {
    return await sendAndConfirmTransaction(
      'swap',
      this.connection,
      new Transaction().add(
        TokenSwap.swapInstruction(
          this.tokenSwap,
          this.authority,
          userTransferAuthority.publicKey,
          userSource,
          poolSource,
          poolDestination,
          userDestination,
          this.poolToken,
          this.feeAccount,
          hostFeeAccount,
          this.swapProgramId,
          this.tokenProgramId,
          amountIn,
          minimumAmountOut,
        ),
      ),
      this.payer,
      userTransferAuthority,
    );
  }

  static swapInstruction(
    tokenSwap: PublicKey,
    authority: PublicKey,
    userTransferAuthority: PublicKey,
    userSource: PublicKey,
    poolSource: PublicKey,
    poolDestination: PublicKey,
    userDestination: PublicKey,
    poolMint: PublicKey,
    feeAccount: PublicKey,
    hostFeeAccount: PublicKey | null,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    amountIn: number | Numberu64,
    minimumAmountOut: number | Numberu64,
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('amountIn'),
      Layout.uint64('minimumAmountOut'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: 1, // Swap instruction
        amountIn: new Numberu64(amountIn).toBuffer(),
        minimumAmountOut: new Numberu64(minimumAmountOut).toBuffer(),
      },
      data,
    );

    const keys = [
      {pubkey: tokenSwap, isSigner: false, isWritable: false},
      {pubkey: authority, isSigner: false, isWritable: false},
      {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
      {pubkey: userSource, isSigner: false, isWritable: true},
      {pubkey: poolSource, isSigner: false, isWritable: true},
      {pubkey: poolDestination, isSigner: false, isWritable: true},
      {pubkey: userDestination, isSigner: false, isWritable: true},
      {pubkey: poolMint, isSigner: false, isWritable: true},
      {pubkey: feeAccount, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    ];
    if (hostFeeAccount !== null) {
      keys.push({pubkey: hostFeeAccount, isSigner: false, isWritable: true});
    }
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }

  /**
   * Deposit tokens into the pool
   * @param userAccountA User account for token A
   * @param userAccountB User account for token B
   * @param poolAccount User account for pool token
   * @param userTransferAuthority Account delegated to transfer user's tokens
   * @param poolTokenAmount Amount of pool tokens to mint
   * @param maximumTokenA The maximum amount of token A to deposit
   * @param maximumTokenB The maximum amount of token B to deposit
   */
  async depositAllTokenTypes(
    userAccountA: PublicKey,
    // userAccountB: PublicKey,
    poolAccount: PublicKey,
    userTransferAuthority: Account,
    poolTokenAmount: number | Numberu64,
    // maximumTokenA: number | Numberu64,
    // maximumTokenB: number | Numberu64,
  ): Promise<TransactionSignature> {
    return await sendAndConfirmTransaction(
      'depositAllTokenTypes',
      this.connection,
      new Transaction().add(
        TokenSwap.depositAllTokenTypesInstruction(
          this.tokenSwap,
          this.authority,
          userTransferAuthority.publicKey,
          userAccountA,
          // userAccountB,
          this.tokenAccountA,
          // this.tokenAccountB,
          this.poolToken,
          poolAccount,
          this.swapProgramId,
          this.tokenProgramId,
          poolTokenAmount,
        ),
      ),
      this.payer,
      userTransferAuthority,
    );
  }

  static depositAllTokenTypesInstruction(
    tokenSwap: PublicKey,
    authority: PublicKey,
    userTransferAuthority: PublicKey,
    sourceA: PublicKey,
    // sourceB: PublicKey,
    intoA: PublicKey,
    // intoB: PublicKey,
    poolToken: PublicKey,
    poolAccount: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    poolTokenAmount: number | Numberu64,
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('poolTokenAmount'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: 1, // Deposit instruction
        tokenamount: new Numberu64(poolTokenAmount).toBuffer(),
      },
      data,
    );

    const keys = [
      {pubkey: tokenSwap, isSigner: false, isWritable: false},
      {pubkey: authority, isSigner: false, isWritable: false},
      {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
      {pubkey: sourceA, isSigner: false, isWritable: true},
      // {pubkey: sourceB, isSigner: false, isWritable: true},
      {pubkey: intoA, isSigner: false, isWritable: true},
      // {pubkey: intoB, isSigner: false, isWritable: true},
      {pubkey: poolToken, isSigner: false, isWritable: true},
      {pubkey: poolAccount, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    ];
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }

  /**
   * Withdraw tokens from the pool
   *
   * @param userAccountA User account for token A
   * @param userAccountB User account for token B
   * @param poolAccount User account for pool token
   * @param userTransferAuthority Account delegated to transfer user's tokens
   * @param poolTokenAmount Amount of pool tokens to burn
   */
  async withdrawAllTokenTypes(
    userAccountA: PublicKey,
    // userAccountB: PublicKey,
    poolAccount: PublicKey,
    userTransferAuthority: Account,
    poolTokenAmount: number | Numberu64,
    minimumTokenA: number | Numberu64,
    minimumTokenB: number | Numberu64,
  ): Promise<TransactionSignature> {
    return await sendAndConfirmTransaction(
      'withdraw',
      this.connection,
      new Transaction().add(
        TokenSwap.withdrawAllTokenTypesInstruction(
          this.tokenSwap,
          this.authority,
          userTransferAuthority.publicKey,
          this.poolToken,
          this.feeAccount,
          poolAccount,
          this.tokenAccountA,
          userAccountA,
          this.swapProgramId,
          this.tokenProgramId,
          poolTokenAmount,
        ),
      ),
      this.payer,
      userTransferAuthority,
    );
  }

  static withdrawAllTokenTypesInstruction(
    tokenSwap: PublicKey,
    authority: PublicKey,
    userTransferAuthority: PublicKey,
    poolMint: PublicKey,
    feeAccount: PublicKey,
    sourcePoolAccount: PublicKey,
    fromA: PublicKey,
    userAccountA: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    poolTokenAmount: number | Numberu64,
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('poolTokenAmount'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: 2, // Withdraw instruction
        tokenamount: new Numberu64(poolTokenAmount).toBuffer(),
      },
      data,
    );

    const keys = [
      {pubkey: tokenSwap, isSigner: false, isWritable: false},
      {pubkey: authority, isSigner: false, isWritable: false},
      {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
      {pubkey: poolMint, isSigner: false, isWritable: true},
      {pubkey: sourcePoolAccount, isSigner: false, isWritable: true},
      {pubkey: fromA, isSigner: false, isWritable: true},
      {pubkey: userAccountA, isSigner: false, isWritable: true},
      {pubkey: feeAccount, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    ];
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }

  static async getMinBalanceRentForExemptTokenStreamAggrement(
    connection: Connection,
  ): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(
      TokenStreamAggrementLayout.span,
    );
  }

  static async getMinBalanceRentForExemptTokenStream(
    connection: Connection,
  ): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(
      TokenStreamLayout.span,
    );
  }
  static createInitStreamInstruction(
    tokenSwap: PublicKey,
    authority: PublicKey,
    userTransferAuthority: PublicKey,
    tokenStreamAggrementA: PublicKey,
    tokenStreamAggrementB: PublicKey,
    userAccountA: PublicKey,
    userAccountB: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
  ): TransactionInstruction {
    console.log(" tokenSwap swapProgramId tokenProgramId", tokenSwap, swapProgramId, tokenProgramId);

    const keys = [
      {pubkey: tokenSwap, isSigner: false, isWritable: true},
      {pubkey: authority, isSigner: false, isWritable: false},
      {pubkey: userTransferAuthority, isSigner: false, isWritable: false},
      {pubkey: userAccountA, isSigner: false, isWritable: false},
      {pubkey: tokenStreamAggrementA, isSigner: false, isWritable: false},
      {pubkey: userAccountB, isSigner: false, isWritable: false},
      {pubkey: tokenStreamAggrementB, isSigner: false, isWritable: false},
      {pubkey: swapProgramId, isSigner: false, isWritable: false},
    ];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.nu64('flowRate'),
    ]);
    // let data = Buffer.alloc(9);
    let data = Buffer.alloc(commandDataLayout.span);

    const flowRateNum = 12124380;

    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: 3, // InitializeSwap instruction
          // flowRate: new Numberu64(flowRateNum).toBuffer(),
          flowRate: new Numberu64(flowRateNum),
        },
        data,
      );
      data = data.slice(0, encodeLength);
    }
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }


  /**
   * Create a new Token Swap
   *
   * @param connection The connection to use
   * @param payer Pays for the transaction
   * @param tokenStreamAggrementAccount The token swap account
   * @param authority The authority over the swap and accounts
   * @param nonce The nonce used to generate the authority
   * @param tokenAccountA: The token swap's Token A account
   * @param tokenAccountB: The token swap's Token B account
   * @param poolToken The pool token
   * @param tokenAccountPool The token swap's pool token account
   * @param tokenProgramId The program ID of the token program
   * @param swapProgramId The program ID of the token-swap program
   * @param feeNumerator Numerator of the fee ratio
   * @param feeDenominator Denominator of the fee ratio
   * @return Token object for the newly minted token, Public key of the account holding the total supply of new tokens
   */

  async createTokenStreamAggrement(
    connection: Connection,
    // payer: Account,
    // tokenStreamAggrementAccount: Account,
    tokenStreamAggrementA: Account,
    tokenStreamAggrementB: Account,
    userTransferAuthority: Account,
    authority: PublicKey,
    userAccountA: PublicKey,
    userAccountB: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
  ): Promise<void> {
    console.log('In createTokenStreamAggrement');

    let transaction;
    // Allocate memory for the account
    const balanceNeeded = await TokenSwap.getMinBalanceRentForExemptTokenStream(
      connection,
    );
    const balanceNeededAggrement = await TokenSwap.getMinBalanceRentForExemptTokenStreamAggrement(
      connection,
    );
 
    console.log('In createTokenStreamAggrement balanceNeeded', balanceNeeded);
    transaction = new Transaction();

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: this.payer.publicKey,
        newAccountPubkey: tokenStreamAggrementA.publicKey,
        lamports: balanceNeededAggrement,
        space: TokenStreamAggrementLayout.span,
        programId: swapProgramId,
      }),
    );

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: this.payer.publicKey,
        newAccountPubkey: tokenStreamAggrementB.publicKey,
        lamports: balanceNeededAggrement,
        space: TokenStreamAggrementLayout.span,
        programId: swapProgramId,
      }),
    );

    const instruction = TokenSwap.createInitStreamInstruction(
      this.tokenSwap,
      authority,
      // this.authority,
      userTransferAuthority.publicKey,
      tokenStreamAggrementA.publicKey,
      tokenStreamAggrementB.publicKey,
      userAccountA,
      this.tokenAccountA,
      this.swapProgramId,
      this.tokenProgramId,
    );

    console.log(" Gott INstructions");
    transaction.add(instruction);
    await sendAndConfirmTransaction(
      'createAccount and InitializeSwap',
      connection,
      transaction,
      this.payer,
      tokenStreamAggrementA,
      tokenStreamAggrementB
    );

  }
}
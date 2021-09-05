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
  Layout.publicKey('tokenAccountB'),
  Layout.publicKey('tokenPool'),
  Layout.publicKey('mintA'),
  Layout.publicKey('mintB'),
  Layout.publicKey('feeAccount'),
  // Layout.uint64('tradeFeeNumerator'),
  // Layout.uint64('tradeFeeDenominator'),
  // Layout.uint64('ownerTradeFeeNumerator'),
  // Layout.uint64('ownerTradeFeeDenominator'),
  // Layout.uint64('ownerWithdrawFeeNumerator'),
  // Layout.uint64('ownerWithdrawFeeDenominator'),
  // Layout.uint64('hostFeeNumerator'),
  // Layout.uint64('hostFeeDenominator'),
  // BufferLayout.u8('curveType'),
  // BufferLayout.blob(32, 'curveParameters'),
]);

export const TokenStreamLayout = BufferLayout.struct([
  // BufferLayout.u8('version'),
  // BufferLayout.u8('isInitialized'),
  // BufferLayout.u8('nonce'),
  // Layout.publicKey('tokenProgramId'),
  // Layout.publicKey('token'),
  // Layout.publicKey('streamTokenMint'),
  // Layout.publicKey('mintToken'),
  // Layout.publicKey('feeAccount'),

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

]);

export const TokenStreamAggrementLayout = BufferLayout.struct([
  // BufferLayout.u8('version'),
  BufferLayout.u8('isInitialized'),
  BufferLayout.u8('agreementLength'),
  BufferLayout.blob(32, 'stream_balance'),
  BufferLayout.blob(720, 'agreements'),
  Layout.publicKey('stream_token_info_account'),
  // Layout.publicKey('tokenAccountB'),
  // Layout.publicKey('tokenPool'),
  // Layout.publicKey('mintA'),
  // Layout.publicKey('mintB'),
  // Layout.publicKey('feeAccount'),
  // Layout.uint64('tradeFeeNumerator'),
  // Layout.uint64('tradeFeeDenominator'),
  // Layout.uint64('ownerTradeFeeNumerator'),
  // Layout.uint64('ownerTradeFeeDenominator'),
  // Layout.uint64('ownerWithdrawFeeNumerator'),
  // Layout.uint64('ownerWithdrawFeeDenominator'),
  // Layout.uint64('hostFeeNumerator'),
  // Layout.uint64('hostFeeDenominator'),
  // BufferLayout.u8('curveType'),
  // BufferLayout.blob(32, 'curveParameters'),
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
   * @param tokenAccountB The token swap's Token B account
   * @param mintA The mint of Token A
   * @param mintB The mint of Token B
  //  * @param tradeFeeNumerator The trade fee numerator
  //  * @param tradeFeeDenominator The trade fee denominator
  //  * @param ownerTradeFeeNumerator The owner trade fee numerator
  //  * @param ownerTradeFeeDenominator The owner trade fee denominator
  //  * @param ownerWithdrawFeeNumerator The owner withdraw fee numerator
  //  * @param ownerWithdrawFeeDenominator The owner withdraw fee denominator
  //  * @param hostFeeNumerator The host fee numerator
  //  * @param hostFeeDenominator The host fee denominator
  //  * @param curveType The curve type
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
    public tokenAccountB: PublicKey,
    public mintA: PublicKey,
    public mintB: PublicKey,
    // public tradeFeeNumerator: Numberu64,
    // public tradeFeeDenominator: Numberu64,
    // public ownerTradeFeeNumerator: Numberu64,
    // public ownerTradeFeeDenominator: Numberu64,
    // public ownerWithdrawFeeNumerator: Numberu64,
    // public ownerWithdrawFeeDenominator: Numberu64,
    // public hostFeeNumerator: Numberu64,
    // public hostFeeDenominator: Numberu64,
    // public curveType: number,
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
    this.tokenAccountB = tokenAccountB;
    this.mintA = mintA;
    this.mintB = mintB;
    // this.tradeFeeNumerator = tradeFeeNumerator;
    // this.tradeFeeDenominator = tradeFeeDenominator;
    // this.ownerTradeFeeNumerator = ownerTradeFeeNumerator;
    // this.ownerTradeFeeDenominator = ownerTradeFeeDenominator;
    // this.ownerWithdrawFeeNumerator = ownerWithdrawFeeNumerator;
    // this.ownerWithdrawFeeDenominator = ownerWithdrawFeeDenominator;
    // this.hostFeeNumerator = hostFeeNumerator;
    // this.hostFeeDenominator = hostFeeDenominator;
    // this.curveType = curveType;
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
  // static async getMinBalanceRentForExemptTokenStreamAggrement(
  //   connection: Connection,
  // ): Promise<number> {
  //   return await connection.getMinimumBalanceForRentExemption(
  //     TokenStreamAggrementLayout.span,
  //   );
  // }

  static createInitSwapInstruction(
    tokenSwapAccount: Account,
    authority: PublicKey,
    tokenAccountA: PublicKey,
    tokenAccountB: PublicKey,
    tokenPool: PublicKey,
    feeAccount: PublicKey,
    tokenAccountPool: PublicKey,
    tokenProgramId: PublicKey,
    swapProgramId: PublicKey,
    nonce: number,
    // tradeFeeNumerator: number,
    // tradeFeeDenominator: number,
    // ownerTradeFeeNumerator: number,
    // ownerTradeFeeDenominator: number,
    // ownerWithdrawFeeNumerator: number,
    // ownerWithdrawFeeDenominator: number,
    // hostFeeNumerator: number,
    // hostFeeDenominator: number,
    // curveType: number,
    // curveParameters: Numberu64 = new Numberu64(0),
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
    // let data = Buffer.alloc(1024);

    // package curve parameters
    // NOTE: currently assume all curves take a single parameter, u64 int
    //       the remaining 24 of the 32 bytes available are filled with 0s
    // let curveParamsBuffer = Buffer.alloc(32);
    // curveParameters.toBuffer().copy(curveParamsBuffer);

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

    console.log(" tokenSwapData 1");
    const poolToken = new PublicKey(tokenSwapData.tokenPool);
    const feeAccount = new PublicKey(tokenSwapData.feeAccount);
    const tokenAccountA = new PublicKey(tokenSwapData.tokenAccountA);
    const tokenAccountB = new PublicKey(tokenSwapData.tokenAccountB);
    console.log(" tokenSwapData 2");
    const mintA = new PublicKey(tokenSwapData.mintA);
    const mintB = new PublicKey(tokenSwapData.mintB);
    const tokenProgramId = new PublicKey(tokenSwapData.tokenProgramId);

    console.log(" tokenSwapData 3");
    // const tradeFeeNumerator = Numberu64.fromBuffer(
    //   tokenSwapData.tradeFeeNumerator,
    // );
    // const tradeFeeDenominator = Numberu64.fromBuffer(
    //   tokenSwapData.tradeFeeDenominator,
    // );
    // const ownerTradeFeeNumerator = Numberu64.fromBuffer(
    //   tokenSwapData.ownerTradeFeeNumerator,
    // );
    // console.log(" tokenSwapData 4");
    // const ownerTradeFeeDenominator = Numberu64.fromBuffer(
    //   tokenSwapData.ownerTradeFeeDenominator,
    // );
    // const ownerWithdrawFeeNumerator = Numberu64.fromBuffer(
    //   tokenSwapData.ownerWithdrawFeeNumerator,
    // );
    // const ownerWithdrawFeeDenominator = Numberu64.fromBuffer(
    //   tokenSwapData.ownerWithdrawFeeDenominator,
    // );
    // console.log(" tokenSwapData 5");
    // const hostFeeNumerator = Numberu64.fromBuffer(
    //   tokenSwapData.hostFeeNumerator,
    // );
    // const hostFeeDenominator = Numberu64.fromBuffer(
    //   tokenSwapData.hostFeeDenominator,
    // );
    // const curveType = tokenSwapData.curveType;
    // console.log(" tokenSwapData 6");

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
      tokenAccountB,
      mintA,
      mintB,
      // tradeFeeNumerator,
      // tradeFeeDenominator,
      // ownerTradeFeeNumerator,
      // ownerTradeFeeDenominator,
      // ownerWithdrawFeeNumerator,
      // ownerWithdrawFeeDenominator,
      // hostFeeNumerator,
      // hostFeeDenominator,
      // curveType,
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
    tokenAccountB: PublicKey,
    poolToken: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
    feeAccount: PublicKey,
    tokenAccountPool: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    nonce: number,
    // tradeFeeNumerator: number,
    // tradeFeeDenominator: number,
    // ownerTradeFeeNumerator: number,
    // ownerTradeFeeDenominator: number,
    // ownerWithdrawFeeNumerator: number,
    // ownerWithdrawFeeDenominator: number,
    // hostFeeNumerator: number,
    // hostFeeDenominator: number,
    // curveType: number,
    // curveParameters?: Numberu64,
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
      tokenAccountB,
      mintA,
      mintB,
      // new Numberu64(tradeFeeNumerator),
      // new Numberu64(tradeFeeDenominator),
      // new Numberu64(ownerTradeFeeNumerator),
      // new Numberu64(ownerTradeFeeDenominator),
      // new Numberu64(ownerWithdrawFeeNumerator),
      // new Numberu64(ownerWithdrawFeeDenominator),
      // new Numberu64(hostFeeNumerator),
      // new Numberu64(hostFeeDenominator),
      // curveType,
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
      tokenAccountB,
      poolToken,
      feeAccount,
      tokenAccountPool,
      tokenProgramId,
      swapProgramId,
      nonce,
      // tradeFeeNumerator,
      // tradeFeeDenominator,
      // ownerTradeFeeNumerator,
      // ownerTradeFeeDenominator,
      // ownerWithdrawFeeNumerator,
      // ownerWithdrawFeeDenominator,
      // hostFeeNumerator,
      // hostFeeDenominator,
      // curveType,
      // curveParameters,
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
    userAccountB: PublicKey,
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
          userAccountB,
          this.tokenAccountA,
          this.tokenAccountB,
          this.poolToken,
          poolAccount,
          this.swapProgramId,
          this.tokenProgramId,
          poolTokenAmount,
          // maximumTokenA,
          // maximumTokenB,
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
    sourceB: PublicKey,
    intoA: PublicKey,
    intoB: PublicKey,
    poolToken: PublicKey,
    poolAccount: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    poolTokenAmount: number | Numberu64,
    // maximumTokenA: number | Numberu64,
    // maximumTokenB: number | Numberu64,
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('poolTokenAmount'),
      // Layout.uint64('maximumTokenA'),
      // Layout.uint64('maximumTokenB'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: 1, // Deposit instruction
        tokenamount: new Numberu64(poolTokenAmount).toBuffer(),
        // maximumTokenA: new Numberu64(maximumTokenA).toBuffer(),
        // maximumTokenB: new Numberu64(maximumTokenB).toBuffer(),
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
   * @param minimumTokenA The minimum amount of token A to withdraw
   * @param minimumTokenB The minimum amount of token B to withdraw
   */
  async withdrawAllTokenTypes(
    userAccountA: PublicKey,
    userAccountB: PublicKey,
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
          this.tokenAccountB,
          userAccountA,
          userAccountB,
          this.swapProgramId,
          this.tokenProgramId,
          poolTokenAmount,
          minimumTokenA,
          minimumTokenB,
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
    fromB: PublicKey,
    userAccountA: PublicKey,
    userAccountB: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    poolTokenAmount: number | Numberu64,
    minimumTokenA: number | Numberu64,
    minimumTokenB: number | Numberu64,
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('poolTokenAmount'),
      // Layout.uint64('minimumTokenA'),
      // Layout.uint64('minimumTokenB'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: 2, // Withdraw instruction
        tokenamount: new Numberu64(poolTokenAmount).toBuffer(),
        // minimumTokenA: new Numberu64(minimumTokenA).toBuffer(),
        // minimumTokenB: new Numberu64(minimumTokenB).toBuffer(),
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
      // {pubkey: fromB, isSigner: false, isWritable: true},
      {pubkey: userAccountA, isSigner: false, isWritable: true},
      // {pubkey: userAccountB, isSigner: false, isWritable: true},
      {pubkey: feeAccount, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    ];
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }

  /**
   * Deposit one side of tokens into the pool
   * @param userAccount User account to deposit token A or B
   * @param poolAccount User account to receive pool tokens
   * @param userTransferAuthority Account delegated to transfer user's tokens
   * @param sourceTokenAmount The amount of token A or B to deposit
   * @param minimumPoolTokenAmount Minimum amount of pool tokens to mint
   */
  async depositSingleTokenTypeExactAmountIn(
    userAccount: PublicKey,
    poolAccount: PublicKey,
    userTransferAuthority: Account,
    sourceTokenAmount: number | Numberu64,
    minimumPoolTokenAmount: number | Numberu64,
  ): Promise<TransactionSignature> {
    return await sendAndConfirmTransaction(
      'depositSingleTokenTypeExactAmountIn',
      this.connection,
      new Transaction().add(
        TokenSwap.depositSingleTokenTypeExactAmountInInstruction(
          this.tokenSwap,
          this.authority,
          userTransferAuthority.publicKey,
          userAccount,
          this.tokenAccountA,
          this.tokenAccountB,
          this.poolToken,
          poolAccount,
          this.swapProgramId,
          this.tokenProgramId,
          sourceTokenAmount,
          minimumPoolTokenAmount,
        ),
      ),
      this.payer,
      userTransferAuthority,
    );
  }

  static depositSingleTokenTypeExactAmountInInstruction(
    tokenSwap: PublicKey,
    authority: PublicKey,
    userTransferAuthority: PublicKey,
    source: PublicKey,
    intoA: PublicKey,
    intoB: PublicKey,
    poolToken: PublicKey,
    poolAccount: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    sourceTokenAmount: number | Numberu64,
    minimumPoolTokenAmount: number | Numberu64,
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('sourceTokenAmount'),
      Layout.uint64('minimumPoolTokenAmount'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: 4, // depositSingleTokenTypeExactAmountIn instruction
        sourceTokenAmount: new Numberu64(sourceTokenAmount).toBuffer(),
        minimumPoolTokenAmount: new Numberu64(
          minimumPoolTokenAmount,
        ).toBuffer(),
      },
      data,
    );

    const keys = [
      {pubkey: tokenSwap, isSigner: false, isWritable: false},
      {pubkey: authority, isSigner: false, isWritable: false},
      {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
      {pubkey: source, isSigner: false, isWritable: true},
      {pubkey: intoA, isSigner: false, isWritable: true},
      {pubkey: intoB, isSigner: false, isWritable: true},
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
   * @param userAccount User account to receive token A or B
   * @param poolAccount User account to burn pool token
   * @param userTransferAuthority Account delegated to transfer user's tokens
   * @param destinationTokenAmount The amount of token A or B to withdraw
   * @param maximumPoolTokenAmount Maximum amount of pool tokens to burn
   */
  async withdrawSingleTokenTypeExactAmountOut(
    userAccount: PublicKey,
    poolAccount: PublicKey,
    userTransferAuthority: Account,
    destinationTokenAmount: number | Numberu64,
    maximumPoolTokenAmount: number | Numberu64,
  ): Promise<TransactionSignature> {
    return await sendAndConfirmTransaction(
      'withdrawSingleTokenTypeExactAmountOut',
      this.connection,
      new Transaction().add(
        TokenSwap.withdrawSingleTokenTypeExactAmountOutInstruction(
          this.tokenSwap,
          this.authority,
          userTransferAuthority.publicKey,
          this.poolToken,
          this.feeAccount,
          poolAccount,
          this.tokenAccountA,
          this.tokenAccountB,
          userAccount,
          this.swapProgramId,
          this.tokenProgramId,
          destinationTokenAmount,
          maximumPoolTokenAmount,
        ),
      ),
      this.payer,
      userTransferAuthority,
    );
  }

  static withdrawSingleTokenTypeExactAmountOutInstruction(
    tokenSwap: PublicKey,
    authority: PublicKey,
    userTransferAuthority: PublicKey,
    poolMint: PublicKey,
    feeAccount: PublicKey,
    sourcePoolAccount: PublicKey,
    fromA: PublicKey,
    fromB: PublicKey,
    userAccount: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    destinationTokenAmount: number | Numberu64,
    maximumPoolTokenAmount: number | Numberu64,
  ): TransactionInstruction {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.uint64('destinationTokenAmount'),
      Layout.uint64('maximumPoolTokenAmount'),
    ]);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        instruction: 5, // withdrawSingleTokenTypeExactAmountOut instruction
        destinationTokenAmount: new Numberu64(
          destinationTokenAmount,
        ).toBuffer(),
        maximumPoolTokenAmount: new Numberu64(
          maximumPoolTokenAmount,
        ).toBuffer(),
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
      {pubkey: fromB, isSigner: false, isWritable: true},
      {pubkey: userAccount, isSigner: false, isWritable: true},
      {pubkey: feeAccount, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    ];
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }


  // async function createAggremeentAccount(owner: PublicKey, payer: Account, programId, ): Promise<PublicKey> {
  //   // Allocate memory for the account
  //   const balanceNeeded = await getMinBalanceRentForExemptTokenStream(
  //     this.connection,
  //   );
  
  //   const newAccount = Keypair.generate();
  //   const transaction = new Transaction();
  //   transaction.add(
  //     SystemProgram.createAccount({
  //       fromPubkey: payer.publicKey,
  //       newAccountPubkey: newAccount.publicKey,
  //       lamports: balanceNeeded,
  //       space: AccountLayout.span,
  //       programId: programId,
  //     }),
  //   );
  
  //   const mintPublicKey = this.publicKey;
  //   transaction.add(
  //     Token.createInitAccountInstruction(
  //       this.programId,
  //       mintPublicKey,
  //       newAccount.publicKey,
  //       owner,
  //     ),
  //   );
  //     }
  

    /**
   * Withdraw tokens from the pool
   *
   * @param userAccountA User account for token A
   * @param userAccountB User account for token B
   * @param poolAccount User account for pool token
   * @param userTransferAuthority Account delegated to transfer user's tokens
   * @param poolTokenAmount Amount of pool tokens to burn
   * @param minimumTokenA The minimum amount of token A to withdraw
   * @param minimumTokenB The minimum amount of token B to withdraw
   */
  async startStreamTypes(
    userTransferAuthority: Account,
    flowRate: number | Numberu64,
    swapProgramId: PublicKey,
    payer: Signer,
  ): Promise<TransactionSignature> {
    let transaction;
    const userAgggrementA = new Account();
    const userAgggrementB = new Account();

    const balanceNeeded = await TokenSwap.getMinBalanceRentForExemptTokenStreamAggrement(
      this.connection,
    );

    transaction = new Transaction();

    // transaction.add(
    //   SystemProgram.createAccount({
    //     fromPubkey: payer.publicKey,
    //     newAccountPubkey: userAgggrementA.publicKey,
    //     lamports: balanceNeeded,
    //     space: TokenStreamAggrementLayout.span,
    //     programId: swapProgramId,
    //   }));

    //   transaction.add(
    //     SystemProgram.createAccount({
    //       fromPubkey: payer.publicKey,
    //       newAccountPubkey: userAgggrementB.publicKey,
    //       lamports: balanceNeeded,
    //       space: TokenStreamAggrementLayout.span,
    //       programId: swapProgramId,
    //     }));

    // transaction.add(
    //   SystemProgram.createAccount({
    //     fromPubkey: payer.publicKey,
    //     newAccountPubkey: this.tokenSwap,
    //     lamports: balanceNeeded,
    //     space: TokenStreamAggrementLayout.span,
    //     programId: swapProgramId,
    //   }));
  
    transaction.add(
      TokenSwap.startStreamTypesInstruction(
        this.tokenSwap,
        this.authority,
        userTransferAuthority.publicKey,
        this.tokenAccountA,
        userAgggrementA.publicKey,
        this.tokenAccountB,
        userAgggrementB.publicKey,
        this.swapProgramId,
        this.tokenProgramId,
        flowRate,
        // minimumTokenA,
        // minimumTokenB,
      ),
    );
    console.log(" sending sendAndConfirmTransaction ***");
    
    return await sendAndConfirmTransaction(
      'withdraw',
      this.connection,
      transaction,
      this.payer,
      this.tokenSwapAccount,
      userAgggrementA,
      userAgggrementB,
      // userTransferAuthority,
    );
  }

  static startStreamTypesInstruction(
    tokenSwap: PublicKey,
    authority: PublicKey,
    userTransferAuthority: PublicKey,
    userAccountA: PublicKey,
    userAggrementA: PublicKey,
    userAccountB: PublicKey,
    userAggrementB: PublicKey,
    swapProgramId: PublicKey,
    tokenProgramId: PublicKey,
    flowRate: number | Numberu64,
  ): TransactionInstruction {

    const keys = [
      {pubkey: tokenSwap, isSigner: false, isWritable: false},
      {pubkey: authority, isSigner: false, isWritable: false},
      {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
      {pubkey: userAccountA, isSigner: false, isWritable: true},
      {pubkey: userAggrementA, isSigner: false, isWritable: true},
      {pubkey: userAccountB, isSigner: false, isWritable: true},
      {pubkey: userAggrementB, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    ];

    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.nu64('flowRate'),
    ]);

    let data = Buffer.alloc(dataLayout.span);
    const flowRateNum = 12124380;

    {
      const encodeLength = dataLayout.encode(
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
      // {pubkey: tokenProgramId, isSigner: false, isWritable: false},
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
    payer: Account,
    tokenStreamAggrementAccount: Account,
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

    // transaction.add(
    //   SystemProgram.createAccount({
    //     fromPubkey: payer.publicKey,
    //     newAccountPubkey: tokenStreamAggrementAccount.publicKey,
    //     lamports: balanceNeeded,
    //     space: TokenStreamLayout.span,
    //     programId: swapProgramId,
    //   }),
    // );

    const instruction = TokenSwap.createInitStreamInstruction(
      this.tokenSwap,
      authority,
      userTransferAuthority.publicKey,
      tokenStreamAggrementA.publicKey,
      tokenStreamAggrementB.publicKey,
      userAccountA,
      userAccountB,
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
      // this.tokenSw,
      tokenStreamAggrementA,
      tokenStreamAggrementB
    );

    // return tokenStreamAggrement;
  }



  //     /**
  //  * Withdraw tokens from the pool
  //  *
  //  * @param userAccountA User account for token A
  //  * @param userAccountB User account for token B
  //  * @param poolAccount User account for pool token
  //  * @param userTransferAuthority Account delegated to transfer user's tokens
  //  * @param flowRate Amount of pool tokens to burn
  //  * @param minimumTokenA The minimum amount of token A to withdraw
  //  * @param minimumTokenB The minimum amount of token B to withdraw
  //  */
  // async stopStreamTypes(
  //   userAgggrementA: PublicKey,
  //   userAgggrementB: PublicKey,
  //   userTransferAuthority: Account,
  //   flowRate: number | Numberu64,
  //   swapProgramId: PublicKey,
  // ): Promise<TransactionSignature> {

  
  //   return await sendAndConfirmTransaction(
  //     'withdraw',
  //     this.connection,
  //     new Transaction().add(
  //       TokenSwap.stoptreamTypesInstruction(
  //         this.tokenSwap,
  //         this.authority,
  //         userTransferAuthority.publicKey,
  //         // this.poolToken,
  //         // this.feeAccount,
  //         // poolAccount,
  //         this.tokenAccountA,
  //         userAgggrementA,
  //         this.tokenAccountB,
  //         userAgggrementB,
  //         // userAgggrementA,
  //         // userAgggrementB,
  //         this.swapProgramId,
  //         this.tokenProgramId,
  //         flowRate,
  //         // minimumTokenA,
  //         // minimumTokenB,
  //       ),
  //     ),
  //     this.payer,
  //     userTransferAuthority,
  //   );
  // }

  // static stoptreamTypesInstruction(
  //   tokenSwap: PublicKey,
  //   authority: PublicKey,
  //   userTransferAuthority: PublicKey,
  //   // poolMint: PublicKey,
  //   // feeAccount: PublicKey,
  //   // sourcePoolAccount: PublicKey,
  //   userAccountA: PublicKey,
  //   userAggrementA: PublicKey,
  //   userAccountB: PublicKey,
  //   userAggrementB: PublicKey,
  //   swapProgramId: PublicKey,
  //   tokenProgramId: PublicKey,
  //   flowRate: number | Numberu64,
  //   // minimumTokenA: number | Numberu64,
  //   // minimumTokenB: number | Numberu64,
  // ): TransactionInstruction {
  //   const dataLayout = BufferLayout.struct([
  //     BufferLayout.u8('instruction'),
  //     Layout.uint64('flowRate'),
  //     // Layout.uint64('minimumTokenA'),
  //     // Layout.uint64('minimumTokenB'),
  //   ]);

  //   const data = Buffer.alloc(dataLayout.span);
  //   dataLayout.encode(
  //     {
  //       instruction: 4, // Withdraw instruction
  //       flowRate: new Numberu64(flowRate).toBuffer(),
  //       // minimumTokenA: new Numberu64(minimumTokenA).toBuffer(),
  //       // minimumTokenB: new Numberu64(minimumTokenB).toBuffer(),
  //     },
  //     data,
  //   );

  //   const keys = [
  //     {pubkey: tokenSwap, isSigner: false, isWritable: false},
  //     {pubkey: authority, isSigner: false, isWritable: false},
  //     {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
  //     {pubkey: userAccountA, isSigner: false, isWritable: true},
  //     {pubkey: userAggrementA, isSigner: false, isWritable: true},
  //     {pubkey: userAccountB, isSigner: false, isWritable: true},
  //     {pubkey: userAggrementB, isSigner: false, isWritable: true},
  //     {pubkey: tokenProgramId, isSigner: false, isWritable: false},
  //   ];
  //   return new TransactionInstruction({
  //     keys,
  //     programId: swapProgramId,
  //     data,
  //   });
  // }
}


// export class TokenStreamAggrement {
//   /**
//    * Create a Token object attached to the specific token
//    *
//    * @param connection The connection to use
//    * @param tokenStreamAggrement The token swap account
//    * @param swapProgramId The program ID of the token-swap program
//    * @param tokenProgramId The program ID of the token program
//    * @param poolToken The pool token
//    * @param authority The authority over the swap and accounts
//    * @param tokenAccountA The token swap's Token A account
//    * @param tokenAccountB The token swap's Token B account
//    * @param mintA The mint of Token A
//    * @param mintB The mint of Token B
//   //  * @param tradeFeeNumerator The trade fee numerator
//   //  * @param tradeFeeDenominator The trade fee denominator
//   //  * @param ownerTradeFeeNumerator The owner trade fee numerator
//   //  * @param ownerTradeFeeDenominator The owner trade fee denominator
//   //  * @param ownerWithdrawFeeNumerator The owner withdraw fee numerator
//   //  * @param ownerWithdrawFeeDenominator The owner withdraw fee denominator
//   //  * @param hostFeeNumerator The host fee numerator
//   //  * @param hostFeeDenominator The host fee denominator
//   //  * @param curveType The curve type
//    * @param payer Pays for the transaction
//    */
//   constructor(
//     private connection: Connection,
//     public tokenStreamAggrement: PublicKey,
//     public tokenStreamAggrementA: PublicKey,
//     public tokenStreamAggrementB: PublicKey,
//     public userTransferAuthority: PublicKey,
//     public authority: PublicKey,
//     public userAccountA: PublicKey,
//     public userAccountB: PublicKey,
//     public swapProgramId: PublicKey,
//     public tokenProgramId: PublicKey,
//     public payer: Account,
//   ) {
//     this.connection = connection;
//     this.tokenStreamAggrement = tokenStreamAggrement;
//     this.tokenStreamAggrementA = tokenStreamAggrementA;
//     this.tokenStreamAggrementB = tokenStreamAggrementB;
//     this.userTransferAuthority = userTransferAuthority;
//     this.authority = authority;
//     this.userAccountA = userAccountA;
//     this.userAccountB = userAccountB;
//     this.swapProgramId = swapProgramId;
//     this.tokenProgramId = tokenProgramId;
//     this.payer = payer;
//   }


//   static async loadTokenStreamAggrement(
//     connection: Connection,
//     address: PublicKey,
//     programId: PublicKey,
//     payer: Account,
//   ): Promise<TokenStreamAggrement> {
//     const data = await loadAccount(connection, address, programId);
//     const tokenStreamAggrementData = TokenStreamAggrementLayout.decode(data);
//     console.log(" tokenStreamAggrementData ", tokenStreamAggrementData);
//     if (!tokenStreamAggrementData.isInitialized) {
//       throw new Error(`Invalid token swap state`);
//     }

//     const [authority] = await PublicKey.findProgramAddress(
//       [address.toBuffer()],
//       programId,
//     );

//     console.log(" tokenStreamAggrementData 1");
//     const tokenStreamAggrement = new PublicKey(tokenStreamAggrementData.tokenStreamAggrement);
//     const tokenStreamAggrementA = new PublicKey(tokenStreamAggrementData.tokenStreamAggrementA);
//     const tokenStreamAggrementB = new PublicKey(tokenStreamAggrementData.tokenStreamAggrementB);
//     const userTransferAuthority = new PublicKey(tokenStreamAggrementData.userTransferAuthority);
//     const userAccountA = new PublicKey(tokenStreamAggrementData.userAccountA);
//     const userAccountB = new PublicKey(tokenStreamAggrementData.userAccountB);

//     const tokenProgramId = new PublicKey(tokenStreamAggrementData.tokenProgramId);

//     console.log(" tokenStreamAggrementData 3");


//     return new TokenStreamAggrement(
//       connection,
//       tokenStreamAggrement,
//       tokenStreamAggrementA,
//       tokenStreamAggrementB,
//       userTransferAuthority,
//       authority,
//       userAccountA,
//       userAccountB,
//       programId,
//       tokenProgramId,
//       payer,
//     );
//   }
//   /**
//    * Get the minimum balance for the token swap account to be rent exempt
//    *
//    * @return Number of lamports required
//    */
//   static async getMinBalanceRentForExemptTokenStreamAggrement(
//     connection: Connection,
//   ): Promise<number> {
//     return await connection.getMinimumBalanceForRentExemption(
//       TokenStreamAggrementLayout.span,
//     );
//   }

//   static async getMinBalanceRentForExemptTokenStream(
//     connection: Connection,
//   ): Promise<number> {
//     return await connection.getMinimumBalanceForRentExemption(
//       TokenStreamLayout.span,
//     );
//   }
//   static createInitStreamInstruction(
//     tokenStreamAggrementAccount: Account,
//     authority: PublicKey,
//     userTransferAuthority: PublicKey,
//     tokenStreamAggrementA: PublicKey,
//     tokenStreamAggrementB: PublicKey,
//     userAccountA: PublicKey,
//     userAccountB: PublicKey,    tokenProgramId: PublicKey,
//     swapProgramId: PublicKey,
//   ): TransactionInstruction {
//     const keys = [
//       // {pubkey: swapProgramId, isSigner: false, isWritable: false},
//       {pubkey: tokenStreamAggrementAccount.publicKey, isSigner: false, isWritable: true},
//       {pubkey: authority, isSigner: false, isWritable: false},
//       {pubkey: userTransferAuthority, isSigner: false, isWritable: false},
//       {pubkey: userAccountA, isSigner: false, isWritable: false},
//       {pubkey: tokenStreamAggrementA, isSigner: false, isWritable: false},
//       {pubkey: userAccountB, isSigner: false, isWritable: false},
//       {pubkey: tokenStreamAggrementB, isSigner: false, isWritable: false},
//       {pubkey: tokenProgramId, isSigner: false, isWritable: false},
//     ];
//     const commandDataLayout = BufferLayout.struct([
//       BufferLayout.u8('instruction'),
//       BufferLayout.nu64('flowRate'),
//     ]);
//     // let data = Buffer.alloc(9);
//     let data = Buffer.alloc(commandDataLayout.span);

//     const flowRateNum = 12124380;

//     {
//       const encodeLength = commandDataLayout.encode(
//         {
//           instruction: 3, // InitializeSwap instruction
//           // flowRate: new Numberu64(flowRateNum).toBuffer(),
//           flowRate: new Numberu64(flowRateNum),
//         },
//         data,
//       );
//       data = data.slice(0, encodeLength);
//     }
//     return new TransactionInstruction({
//       keys,
//       programId: swapProgramId,
//       data,
//     });
//   }


//   /**
//    * Create a new Token Swap
//    *
//    * @param connection The connection to use
//    * @param payer Pays for the transaction
//    * @param tokenStreamAggrementAccount The token swap account
//    * @param authority The authority over the swap and accounts
//    * @param nonce The nonce used to generate the authority
//    * @param tokenAccountA: The token swap's Token A account
//    * @param tokenAccountB: The token swap's Token B account
//    * @param poolToken The pool token
//    * @param tokenAccountPool The token swap's pool token account
//    * @param tokenProgramId The program ID of the token program
//    * @param swapProgramId The program ID of the token-swap program
//    * @param feeNumerator Numerator of the fee ratio
//    * @param feeDenominator Denominator of the fee ratio
//    * @return Token object for the newly minted token, Public key of the account holding the total supply of new tokens
//    */
//   static async createTokenStreamAggrement(
//     connection: Connection,
//     payer: Account,
//     tokenStreamAggrementAccount: Account,
//     tokenStreamAggrementA: Account,
//     tokenStreamAggrementB: Account,
//     userTransferAuthority: Account,
//     authority: PublicKey,
//     userAccountA: Account,
//     userAccountB: Account,
//     swapProgramId: PublicKey,
//     tokenProgramId: PublicKey,
//   ): Promise<void> {
//     console.log('In createTokenStreamAggrement');

//     let transaction;
//     // const tokenStreamAggrement = new TokenStreamAggrement(
//     //   connection,
//     //   tokenStreamAggrementAccount.publicKey,
//     //   tokenStreamAggrementA.publicKey,
//     //   tokenStreamAggrementB.publicKey,
//     //   userTransferAuthority.publicKey,
//     //   authority,
//     //   userAccountA.publicKey,
//     //   userAccountB.publicKey,
//     //   swapProgramId,
//     //   tokenProgramId,
//     //   payer,
//     // );

//     // Allocate memory for the account
//     const balanceNeeded = await TokenStreamAggrement.getMinBalanceRentForExemptTokenStream(
//       connection,
//     );
//     const balanceNeededAggrement = await TokenStreamAggrement.getMinBalanceRentForExemptTokenStreamAggrement(
//       connection,
//     );
 
//     console.log('In createTokenStreamAggrement balanceNeeded', balanceNeeded);
//     transaction = new Transaction();
//     transaction.add(
//       SystemProgram.createAccount({
//         fromPubkey: payer.publicKey,
//         newAccountPubkey: tokenStreamAggrementA.publicKey,
//         lamports: balanceNeededAggrement,
//         space: TokenStreamAggrementLayout.span,
//         programId: swapProgramId,
//       }),
//     );

//     transaction.add(
//       SystemProgram.createAccount({
//         fromPubkey: payer.publicKey,
//         newAccountPubkey: tokenStreamAggrementB.publicKey,
//         lamports: balanceNeededAggrement,
//         space: TokenStreamAggrementLayout.span,
//         programId: swapProgramId,
//       }),
//     );
//     // transaction.add(
//     //   SystemProgram.createAccount({
//     //     fromPubkey: payer.publicKey,
//     //     newAccountPubkey: tokenStreamAggrementAccount.publicKey,
//     //     lamports: balanceNeeded,
//     //     space: TokenStreamLayout.span,
//     //     programId: swapProgramId,
//     //   }),
//     // );

//     const instruction = TokenStreamAggrement.createInitStreamInstruction(
//       tokenStreamAggrementAccount,
//       authority,
//       userTransferAuthority.publicKey,
//       tokenStreamAggrementA.publicKey,
//       tokenStreamAggrementB.publicKey,
//       userAccountA.publicKey,
//       userAccountB.publicKey,
//       tokenProgramId,
//       swapProgramId,
//     );

//     console.log(" Gott INstructions");
//     transaction.add(instruction);
//     await sendAndConfirmTransaction(
//       'createAccount and InitializeSwap',
//       connection,
//       transaction,
//       this.payer,
//       tokenStreamAggrementAccount,
//       tokenStreamAggrementA,
//       tokenStreamAggrementB
//     );

//     // return tokenStreamAggrement;
//   }


//     /**
//    * Withdraw tokens from the pool
//    *
//    * @param userAccountA User account for token A
//    * @param userAccountB User account for token B
//    * @param poolAccount User account for pool token
//    * @param userTransferAuthority Account delegated to transfer user's tokens
//    * @param poolTokenAmount Amount of pool tokens to burn
//    * @param minimumTokenA The minimum amount of token A to withdraw
//    * @param minimumTokenB The minimum amount of token B to withdraw
//    */
//   // async startStreamTypes(
//   //   // userAgggrementA: PublicKey,
//   //   // userAgggrementB: PublicKey,
//   //   userTransferAuthority: Account,
//   //   flowRate: number | Numberu64,
//   //   swapProgramId: PublicKey,
//   //   payer: Signer,
//   //   streamOwner: Account,
//   // ): Promise<TransactionSignature> {
//   //   let transaction;
//   //   const userAgggrementA = Keypair.generate();
//   //   const userAgggrementB = Keypair.generate();
//   //   // Allocate memory for the account
//   //   const balanceNeeded = await TokenStreamAggrement.getMinBalanceRentForExemptTokenStreamAggrement(
//   //     this.connection,
//   //   );

//   //   console.log('creating token C');
//   //   const mintC = await Token.createMint(
//   //     this.connection,
//   //     payer,
//   //     streamOwner.publicKey,
//   //     null,
//   //     2,
//   //     swapProgramId,
//   //   );
//   //   console.log("payer ", payer.publicKey);
//   //   console.log("userAgggrementA ", userAgggrementA.publicKey);
//   //   console.log("streamOwner ", streamOwner.publicKey);

//   //   transaction = new Transaction();
//   //   transaction.add(
//   //     SystemProgram.createAccount({
//   //       fromPubkey: payer.publicKey,
//   //       newAccountPubkey: userAgggrementA.publicKey,
//   //       lamports: balanceNeeded,
//   //       space: TokenStreamAggrementLayout.span,
//   //       programId: swapProgramId,
//   //     }));


//   //     console.log(" sending sendAndConfirmTransaction");
    
//   //   return await sendAndConfirmTransaction(
//   //     'withdraw',
//   //     this.connection,
//   //     transaction,
//   //     this.payer,
//   //     userTransferAuthority,
//   //   );
//   // }

//   // static startStreamTypesInstruction(
//   //   tokenStreamAggrement: PublicKey,
//   //   authority: PublicKey,
//   //   userTransferAuthority: PublicKey,
//   //   // poolMint: PublicKey,
//   //   // feeAccount: PublicKey,
//   //   // sourcePoolAccount: PublicKey,
//   //   userAccountA: PublicKey,
//   //   userAggrementA: PublicKey,
//   //   userAccountB: PublicKey,
//   //   userAggrementB: PublicKey,
//   //   swapProgramId: PublicKey,
//   //   tokenProgramId: PublicKey,
//   //   flowRate: number | Numberu64,
//   //   // minimumTokenA: number | Numberu64,
//   //   // minimumTokenB: number | Numberu64,
//   // ): TransactionInstruction {
//   //   const dataLayout = BufferLayout.struct([
//   //     BufferLayout.u8('instruction'),
//   //     Layout.uint64('flowRate'),
//   //     // Layout.uint64('minimumTokenA'),
//   //     // Layout.uint64('minimumTokenB'),
//   //   ]);

//   //   const data = Buffer.alloc(dataLayout.span);
//   //   dataLayout.encode(
//   //     {
//   //       instruction: 3, // Withdraw instruction
//   //       flowRate: new Numberu64(flowRate).toBuffer(),
//   //       // minimumTokenA: new Numberu64(minimumTokenA).toBuffer(),
//   //       // minimumTokenB: new Numberu64(minimumTokenB).toBuffer(),
//   //     },
//   //     data,
//   //   );

//   //   const keys = [
//   //     {pubkey: tokenStreamAggrement, isSigner: false, isWritable: false},
//   //     {pubkey: authority, isSigner: false, isWritable: false},
//   //     {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
//   //     {pubkey: userAccountA, isSigner: false, isWritable: true},
//   //     {pubkey: userAggrementA, isSigner: false, isWritable: true},
//   //     {pubkey: userAccountB, isSigner: false, isWritable: true},
//   //     {pubkey: userAggrementB, isSigner: false, isWritable: true},
//   //     {pubkey: tokenProgramId, isSigner: false, isWritable: false},
//   //   ];
//   //   console.log("keys", keys);
//   //   console.log("data", data);
    
//   //   return new TransactionInstruction({
//   //     keys,
//   //     programId: swapProgramId,
//   //     data,
//   //   });
//   // }



//       /**
//    * Withdraw tokens from the pool
//    *
//    * @param userAccountA User account for token A
//    * @param userAccountB User account for token B
//    * @param poolAccount User account for pool token
//    * @param userTransferAuthority Account delegated to transfer user's tokens
//    * @param flowRate Amount of pool tokens to burn
//    * @param minimumTokenA The minimum amount of token A to withdraw
//    * @param minimumTokenB The minimum amount of token B to withdraw
//    */
//   // async stopStreamTypes(
//   //   userAgggrementA: PublicKey,
//   //   userAgggrementB: PublicKey,
//   //   userTransferAuthority: Account,
//   //   flowRate: number | Numberu64,
//   //   swapProgramId: PublicKey,
//   // ): Promise<TransactionSignature> {

  
//   //   return await sendAndConfirmTransaction(
//   //     'withdraw',
//   //     this.connection,
//   //     new Transaction().add(
//   //       TokenStreamAggrement.stoptreamTypesInstruction(
//   //         this.tokenStreamAggrement,
//   //         this.authority,
//   //         userTransferAuthority.publicKey,
//   //         // this.poolToken,
//   //         // this.feeAccount,
//   //         // poolAccount,
//   //         this.tokenAccountA,
//   //         userAgggrementA,
//   //         this.tokenAccountB,
//   //         userAgggrementB,
//   //         // userAgggrementA,
//   //         // userAgggrementB,
//   //         this.swapProgramId,
//   //         this.tokenProgramId,
//   //         flowRate,
//   //         // minimumTokenA,
//   //         // minimumTokenB,
//   //       ),
//   //     ),
//   //     this.payer,
//   //     userTransferAuthority,
//   //   );
//   // }

//   // static stoptreamTypesInstruction(
//   //   tokenStreamAggrement: PublicKey,
//   //   authority: PublicKey,
//   //   userTransferAuthority: PublicKey,
//   //   // poolMint: PublicKey,
//   //   // feeAccount: PublicKey,
//   //   // sourcePoolAccount: PublicKey,
//   //   userAccountA: PublicKey,
//   //   userAggrementA: PublicKey,
//   //   userAccountB: PublicKey,
//   //   userAggrementB: PublicKey,
//   //   swapProgramId: PublicKey,
//   //   tokenProgramId: PublicKey,
//   //   flowRate: number | Numberu64,
//   //   // minimumTokenA: number | Numberu64,
//   //   // minimumTokenB: number | Numberu64,
//   // ): TransactionInstruction {
//   //   const dataLayout = BufferLayout.struct([
//   //     BufferLayout.u8('instruction'),
//   //     Layout.uint64('flowRate'),
//   //     // Layout.uint64('minimumTokenA'),
//   //     // Layout.uint64('minimumTokenB'),
//   //   ]);

//   //   const data = Buffer.alloc(dataLayout.span);
//   //   dataLayout.encode(
//   //     {
//   //       instruction: 2, // Withdraw instruction
//   //       flowRate: new Numberu64(flowRate).toBuffer(),
//   //       // minimumTokenA: new Numberu64(minimumTokenA).toBuffer(),
//   //       // minimumTokenB: new Numberu64(minimumTokenB).toBuffer(),
//   //     },
//   //     data,
//   //   );

//   //   const keys = [
//   //     {pubkey: tokenStreamAggrement, isSigner: false, isWritable: false},
//   //     {pubkey: authority, isSigner: false, isWritable: false},
//   //     {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
//   //     {pubkey: userAccountA, isSigner: false, isWritable: true},
//   //     {pubkey: userAggrementA, isSigner: false, isWritable: true},
//   //     {pubkey: userAccountB, isSigner: false, isWritable: true},
//   //     {pubkey: userAggrementB, isSigner: false, isWritable: true},
//   //     {pubkey: tokenProgramId, isSigner: false, isWritable: false},
//   //   ];
//   //   return new TransactionInstruction({
//   //     keys,
//   //     programId: swapProgramId,
//   //     data,
//   //   });
//   // }
// }
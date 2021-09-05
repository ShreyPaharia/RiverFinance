import {
    Account,
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
  } from '@solana/web3.js';
  import { Numberu64, TokenStreamLayout } from '../../util/utils';
  import * as BufferLayout from 'buffer-layout';
import {sendAndConfirmTransaction} from '../../util/send-and-confirm-transaction';
import { log } from 'util';


async function  getMinBalanceRentForExemptTokenSwap(
  connection: Connection,
): Promise<number> {
  return await connection.getMinimumBalanceForRentExemption(
    TokenStreamLayout.span,
  );
}

  export async function createTokenStream(
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
    tradeFeeNumerator: number,
    tradeFeeDenominator: number,
    ownerTradeFeeNumerator: number,
    ownerTradeFeeDenominator: number,
    ownerWithdrawFeeNumerator: number,
    ownerWithdrawFeeDenominator: number,
    hostFeeNumerator: number,
    hostFeeDenominator: number,
    curveType: number,
    curveParameters?: Numberu64,
  ) {
    let transaction;

    console.log(" in tokenStream");
    // Allocate memory for the account
    const balanceNeeded = await getMinBalanceRentForExemptTokenSwap(
      connection,
    );
    console.log(" got balanceNeeded", balanceNeeded);

    transaction = new Transaction();
    console.log(" Adding account to Tx", transaction);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenSwapAccount.publicKey,
        lamports: balanceNeeded,
        space: TokenStreamLayout.span,
        programId: swapProgramId,
      }),
    );

    const instruction = createInitSwapInstruction(
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
      tradeFeeNumerator,
      tradeFeeDenominator,
      ownerTradeFeeNumerator,
      ownerTradeFeeDenominator,
      ownerWithdrawFeeNumerator,
      ownerWithdrawFeeDenominator,
      hostFeeNumerator,
      hostFeeDenominator,
      curveType,
      curveParameters,
    );

    console.log(" got Instructions ", instruction);

    transaction.add(instruction);
    console.log(" now  sendAndConfirmTransaction");
    await sendAndConfirmTransaction(
      'createAccount and InitializeSwap',
      connection,
      transaction,
      payer,
      tokenSwapAccount,
    );

  }


  function createInitSwapInstruction(
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
    tradeFeeNumerator: number,
    tradeFeeDenominator: number,
    ownerTradeFeeNumerator: number,
    ownerTradeFeeDenominator: number,
    ownerWithdrawFeeNumerator: number,
    ownerWithdrawFeeDenominator: number,
    hostFeeNumerator: number,
    hostFeeDenominator: number,
    curveType: number,
    curveParameters: Numberu64 = new Numberu64(0),
  ): TransactionInstruction {
    console.log(" In createInitSwapInstruction");

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
      // BufferLayout.nu64('tradeFeeNumerator'),
      // BufferLayout.nu64('tradeFeeDenominator'),
      // BufferLayout.nu64('ownerTradeFeeNumerator'),
      // BufferLayout.nu64('ownerTradeFeeDenominator'),
      // BufferLayout.nu64('ownerWithdrawFeeNumerator'),
      // BufferLayout.nu64('ownerWithdrawFeeDenominator'),
      // BufferLayout.nu64('hostFeeNumerator'),
      // BufferLayout.nu64('hostFeeDenominator'),
      // BufferLayout.u8('curveType'),
      // BufferLayout.blob(32, 'curveParameters'),
    ]);
    let data = Buffer.alloc(16);
    // let data = Buffer.alloc(1024);

    // package curve parameters
    // NOTE: currently assume all curves take a single parameter, u64 int
    //       the remaining 24 of the 32 bytes available are filled with 0s
    let curveParamsBuffer = Buffer.alloc(32);
    curveParameters.toBuffer().copy(curveParamsBuffer);

    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: 0, // InitializeSwap instruction
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
          // curveParameters: curveParamsBuffer,
        },
        data,
      );
      data = data.slice(0, encodeLength);
    }
    console.log(" data ", data.length);
    
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data,
    });
  }

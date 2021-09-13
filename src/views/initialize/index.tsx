import React, { useCallback } from "react";
import { useConnection } from "../../contexts/connection";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "../../components/ConnectButton";
import { LABELS, TOKEN_STREAM_PROGRAM_ID } from "../../constants";
import { useWallet } from "@solana/wallet-adapter-react";
import {newAccountWithLamports} from '../../util/new-account-with-lamports';
// import {sendAndConfirmTransaction} from '../../util/send-and-confirm-transaction';
import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {AccountLayout, Token, TOKEN_PROGRAM_ID} from '@solana/spl-token';
import { createTokenStream } from "./createTokenStream"
import { CurveType, Numberu64 } from '../../util/utils';
import {
  // createAccountAndSwapAtomic,
  createTokenStreamAggrement,
  createTokenSwap,
  // startStreaming,
  depositAllTokenTypes,
  withdrawAllTokenTypes,
  // depositSingleTokenTypeExactAmountIn,
  // withdrawSingleTokenTypeExactAmountOut,
} from '../../spl/cli/tokenStreanFacade';



export const InitializeView = () => {
  const connection = useConnection();
  const { publicKey } = useWallet();

  const handleRequest = async () => {
    createTokenSwap();
  };

  return (
    <div className="flexColumn" style={{ flex: 1 }}>
      <div>
        <div className="deposit-input-title" style={{ margin: 10 }}>
        {/* {TOKEN_STREAM_PROGRAM_ID} */}
        {/* {console.log("TOKEN_STREAM_PROGRAM_ID", TOKEN_STREAM_PROGRAM_ID)} */}
        </div>
        <ConnectButton type="primary" onClick={handleRequest}>
          Initalize
        </ConnectButton>
      </div>
    </div>
  );
};

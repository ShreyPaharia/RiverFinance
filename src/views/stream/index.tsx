// @ts-nocheck
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Col, Row } from "antd";
import {  Input,  Menu, Dropdown, Divider } from "antd";

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
import {
  depositAllTokenTypesUI,
} from '../../spl/cli/tokenStreanFacade';
// import { createTokenStream } from "./createTokenStream"
import { CurveType, Numberu64 } from '../../util/utils';
import { DownOutlined, MoneyCollectOutlined, InboxOutlined } from '@ant-design/icons';


let tokenStream;
// authority of the token and accounts
let authority: PublicKey;
// nonce used to generate the authority public key
let nonce: number;
// owner of the user accounts
let owner: Account;
// Token pool
let tokenPool: Token;
let tokenAccountPool: PublicKey;
let feeAccount: PublicKey;
// Tokens swapped
let mintA: Token;
let mintB: Token;
let tokenAccountA: PublicKey;
let tokenAccountB: PublicKey;

export const StreamView = () => {
  const connection = useConnection();
  const { publicKey } = useWallet();

  const handleRequest = async () => {
    await depositAllTokenTypesUI(publicKey, amount);
  };

  const [flowRate, setFlowRate] = useState(1222);
  const [receiverAddr, setReceiverAddr] = useState();


  return (
    <div className="flexColumn" style={{ flex: 1 }}>
      <div>
        <div className="deposit-input-title" style={{ margin: 10 }}>
        <div style={{ margin: '24px 0' }} />
        <Input addonBefore="$"
              style={{ width: 200  }}
              placeholder="Recipient Address"
              autoComplete="off"
              onChange={e => {
                setReceiverAddr(e.target.value);
              }}
            />

          <div style={{ margin: '24px 0'}} />
          <Input addonBefore="$"
              style={{ width: 200  }}
              placeholder="Flow rate"
              autoComplete="off"
              onChange={e => {
                setFlowRate(e.target.value);
              }}
            />

        <div style={{ margin: '24px 0' }} />
            <Button onClick={handleRequest}>Deposit</Button>
          </div>
      </div>
    </div>
  );
};

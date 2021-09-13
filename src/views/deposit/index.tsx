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
  depositAllTokenTypes,
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

export const DepositView = ({ setLoading }) => {
  const connection = useConnection();
  const { publicKey } = useWallet();

  const [streamList, setStreamList] = useState([{key:"DAI", value:"DAI"}]);
  const [stream, setStream] = useState("Select Token");
  const [amount, setAmount] = useState("");
  // const [isLoading, setLoading] = useState(false);

  const handleRequest = async () => {
    setLoading(true);
    // await depositAllTokenTypesUI(publicKey, amount, setLoading);
    await depositAllTokenTypes();
  };

const streamMenus = (
    <Menu onClick={e => {
      // console.log(" in anchorMenu", e);
      // @ts-ignore.
      const newSelected = streamList && streamList.find(item => item.key === e.key);
      console.log("newSelected", newSelected && newSelected.key);
      setStream(newSelected && newSelected.value);
    }}>
      {streamList && streamList.map(item => (
        <Menu.Item key={item.key}  icon={<MoneyCollectOutlined />}>{item.value}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className="flexColumn" style={{ flex: 1 }}>
      <div>
        <div className="deposit-input-title" style={{ margin: 10 }}>
        <div style={{ margin: '24px 0' }} />
          <Dropdown overlay={streamMenus}>
            <Button>
              {stream} <DownOutlined />
            </Button>
          </Dropdown>

          <div style={{ margin: '24px 0'}} />
          <Input addonBefore="$"
              style={{ width: 200  }}
              placeholder="Amount"
              autoComplete="off"
              onChange={e => {
                setAmount(e.target.value);
              }}
            />

        <div style={{ margin: '24px 0' }} />
            <Button onClick={handleRequest}>Deposit</Button>
          </div>
      </div>
    </div>
  );
};

// @ts-nocheck
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Col, Row } from "antd";
import {  Input,  Menu, Dropdown } from "antd";
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
import { CurveType, Numberu64 } from '../../util/utils';
import {
  withdrawAllTokenTypesUI,
} from '../../spl/cli/tokenStreanFacade';
import { DownOutlined, MoneyCollectOutlined , InboxOutlined } from '@ant-design/icons';



export const WithdrawView = () => {
  const connection = useConnection();
  const { publicKey } = useWallet();


  const [streamList, setStreamList] = useState([{key:"DAI", value:"DAI"}]);
  const [stream, setStream] = useState("Select Token");
  const [amount, setAmount] = useState("");

  const handleRequest = async () => {
    await withdrawAllTokenTypesUI(amount);
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
        <Menu.Item key={item.key}  icon={<MoneyCollectOutlined  />}>{item.value}</Menu.Item>
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
              placeholder="Amount"
              autoComplete="off"
              style={{ width: 200  }}
              onChange={e => {
                setAmount(e.target.value);
              }}
            />

        <div style={{ margin: '24px 0' }} />
            <Button onClick={handleRequest}>Withdraw</Button>
          </div>
      </div>
      </div>

  );
};

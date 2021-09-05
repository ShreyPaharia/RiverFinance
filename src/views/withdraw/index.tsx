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
  withdrawAllTokenTypes,
} from '../../spl/cli/tokenStreanFacade';
import { DownOutlined, UserOutlined, InboxOutlined } from '@ant-design/icons';



export const WithdrawView = () => {
  const connection = useConnection();
  const { publicKey } = useWallet();

  const handleRequest = async () => {
    await withdrawAllTokenTypes();
  };

  const [streamList, setStreamList] = useState([]);
  const [stream, setStream] = useState("Select stream type");
  const [amount, setAmount] = useState("");


const streamMenus = (
    <Menu onClick={e => {
      // console.log(" in anchorMenu", e);
      // @ts-ignore.
      const newSelected = streamList && streamList.find(item => item.key === e.key);
      console.log("newSelected", newSelected && newSelected.key);
      setStream(newSelected && newSelected.value);
    }}>
      {streamList && streamList.map(item => (
        <Menu.Item key={item.key}  icon={<UserOutlined />}>{item.value}</Menu.Item>
      ))}
    </Menu>
  );


  return (
    <div className="flexColumn" style={{ flex: 1 }}>
      <div>
        <div className="deposit-input-title" style={{ margin: 10 }}>
        {/* {TOKEN_STREAM_PROGRAM_ID} */}
        {/* {console.log("TOKEN_STREAM_PROGRAM_ID", TOKEN_STREAM_PROGRAM_ID)} */}

        <div  style={{ margin: 8 }} ></div>
        <Col span={8}>

          <Dropdown overlay={streamMenus}>
            <Button>
              {stream} <DownOutlined />
            </Button>
          </Dropdown>
          </Col>

          <Col span={8}>
          <div  style={{ margin: 8 }}></div>
          <Input addonBefore="$"
              placeholder="Amount"
              autoComplete="off"
              onChange={e => {
                setAmount(e.target.value);
              }}
            />
            </Col>

            <div  style={{ margin: 8 }}></div>
          <Col span={8}>
          <Button onClick={handleRequest}>Withdraw</Button>
          </Col>
          </div>


      </div>
    </div>
  );
};

// @ts-nocheck
import React from "react";
// import { Button, Popover } from "antd";
import { Col, Row, Form, Card, Button, Popover, Container, InputGroup } from '@themesberg/react-bootstrap';
import { faHeart, faThumbsUp, faCog } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { SettingOutlined } from "@ant-design/icons";
import { Settings } from "../Settings";
import { LABELS } from "../../constants";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-ant-design";
import { useWallet } from "@solana/wallet-adapter-react";

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const { connected } = useWallet();
  const TopBar = (
    <div className="App-Bar-right">
      <Row>
        <Col>
        <WalletMultiButton type="primary" />
          <div style={{ margin: 5 }} />
          {connected ? <WalletDisconnectButton type="ghost" /> : null}
          <Popover
            placement="topRight"
            Title={LABELS.SETTINGS_TOOLTIP}
            Content={<Settings />}
            trigger="click"
          >
      </Popover>
      {props.right}
        </Col>
        <Col>
        <Button
          variant="outline-gray" className="m-1"
          // icon={faCog}
        >
          <FontAwesomeIcon icon={faCog} className="me-2" />
        </Button>
        </Col>
      </Row>
    </div>
  );

  return TopBar;
};

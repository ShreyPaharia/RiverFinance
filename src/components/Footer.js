
import React from "react";
import moment from "moment-timezone";
import { Card } from '@themesberg/react-bootstrap';

export default (props) => {
  const currentYear = moment().get("year");
  const showSettings = false;

  const toggleSettings = (toggle) => {
    props.toggleSettings(toggle);
  }

  return (
    <div>
      {showSettings ? (
        <Card className="theme-settings">
        </Card>
      ) : (
        <Card className="theme-settings theme-settings-expand" onClick={() => { toggleSettings(true) }}>
          <Card.Body className="p-3 py-2">
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

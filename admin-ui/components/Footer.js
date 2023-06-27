import React from 'react';

const Footer = () => {
  return (
    <footer style={footerStyle}>
        <p style={footerTextStyle}>
          &copy; {new Date().getFullYear()} Momento. All rights reserved.
        </p>
      </footer>
  );
}

const footerStyle = {
  backgroundColor: '#C4F135',
  textAlign: 'center',
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%'
};

const footerTextStyle = {
  fontSize: '14px',
  color: '#000'
};

export default Footer;
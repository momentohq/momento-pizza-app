'use client'
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@aws-amplify/auth';

const Header = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(user => setUser(user))
      .catch(err => console.log(err));
  }, []);

  const navigateHome = () => {
    router.push('/');
  }

  const handleAvatarClick = () => {
    setShowMenu(!showMenu);
  };

  const handleSignOut = () => {
    Auth.signOut()
      .then(() => setUser(null))
      .catch(err => console.log(err));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header style={headerStyle}>
      <h1 style={homeStyle} onClick={navigateHome}>Momento Pizza Admin</h1>
      {user && (
        <div
          style={avatarStyle}
          onClick={handleAvatarClick}
          ref={avatarRef}
        >
          {user.username.charAt(0).toUpperCase()}
          {showMenu && (
            <div style={menuStyle}>
              <div onClick={handleSignOut}>Sign out</div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

const homeStyle = {
  cursor: 'pointer',
  fontSize: '1.7rem'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px',
  backgroundColor: '#25392B',
  width: '100%',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
  fontSize: '1rem'
};

const avatarStyle = {
  position: 'relative',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#C2B2A9',
  color: '#fff',
  fontSize: '20px',
  cursor: 'pointer',
};

const menuStyle = {
  position: 'absolute',
  top: '100%',
  width: '8em',
  right: '0',
  backgroundColor: '#fff',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  borderRadius: '4px',
  padding: '8px',
  zIndex: '999',
  color: '#000',
  fontSize: '1rem'
};

export default Header;

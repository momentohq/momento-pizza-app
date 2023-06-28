'use client'
import { useEffect, useState, useRef } from 'react';
import { Auth } from '@aws-amplify/auth';
import { Heading, Flex, Link, Table, TableRow, TableCell, Badge, View } from '@aws-amplify/ui-react';

const Header = () => {
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(user => setUser(user))
      .catch(err => console.log(err));
  }, []);

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
      if(event.target?.id == 'signoutbtn'){
        handleSignOut();
      }

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
    <Flex direction="row" justifyContent="space-between" alignContent="center" padding="10px" backgroundColor="#25392B" boxShadow="medium">
      <Heading level="3"><Link href='/' textDecoration="none" color="white">Momento Pizza Admin</Link></Heading>
      {user && (
        <View cursor="pointer">
          <Badge size="large" onClick={handleAvatarClick} ref={avatarRef} fontSize="1rem">
            {user.username.charAt(0).toUpperCase()}
          </Badge>
          {showMenu && (
            <Table size="small" highlightOnHover="true" backgroundColor="white" position="absolute" top="3.1em" right="1.1em" width="8em" >
              <TableRow>
                <TableCell id="signoutbtn" style={{cursor: "pointer"}}>Sign out</TableCell>
              </TableRow>
            </Table>
          )}
        </View>
      )}
    </Flex>
  );
};

export default Header;

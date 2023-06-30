import { Heading, Flex, Link } from '@aws-amplify/ui-react';

const Header = () => {
  return (
    <Flex direction="row" justifyContent="space-between" alignContent="center" padding="10px" backgroundColor="#25392B" boxShadow="medium">
      <Heading level="3"><Link href='/' textDecoration="none" color="white">Momento Pizza Admin</Link></Heading>      
    </Flex>
  );
};

export default Header;

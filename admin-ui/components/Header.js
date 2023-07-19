import { Heading, Flex, Link, Text } from '@aws-amplify/ui-react';

const Header = () => {
  return (
    <>
    <Flex direction="row" justifyContent="space-between" alignContent="center" padding="10px" backgroundColor="#25392B" boxShadow="medium">
      <Heading level="3"><Link href='/' textDecoration="none" color="white">Momento Pizza Admin</Link></Heading>      
    </Flex>
    {process.env.NEXT_PUBLIC_ADMIN_API == 'REPLACE_ME' && (
        <Flex direction="column" width="100%" backgroundColor="red" height="3em" alignItems="center" justifyContent="center">
          <Text>You have not finished setting up this environment. Please update the <b>NEXT_PUBLIC_ADMIN_API</b> environment variable in the <i>next.config.js</i> file with the value of your deployed Admin API base url and restart the app.</Text>
        </Flex>
      )}
    </>
  );
};

export default Header;

const { Cloud9Client, ListEnvironmentsCommand } = require('@aws-sdk/client-cloud9')

const cloud9 = new Cloud9Client();

exports.handler = async (event) => {
  try {
    const response = await cloud9.send(new ListEnvironmentsCommand());
    if(!response.environmentIds?.length){
      return { message: 'No Cloud9 environments were found. Please use localhost.'};
    } 

    const environmentId = response.environmentIds[0];

    return {
      adminUi: `https://${environmentId}.vfs.cloud9.${process.env.AWS_REGION}.amazonaws.com:8080`,
      orderUi: `https://${environmentId}.vfs.cloud9.${process.env.AWS_REGION}.amazonaws.com:8081`,
    };
  } catch (error) {
    console.error(error);
    return { message: 'Something went wrong' };
  }
}
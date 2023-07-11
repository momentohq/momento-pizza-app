const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event, context) => {
  try {
    const ipAddress = event.requestContext.identity.sourceIp;
    const id = context.awsRequestId;

    const input = JSON.parse(event.body);
    const timestamp = new Date().toISOString();
    const item = {
      pk: id,
      sk: 'metadata',
      createdAt: timestamp,
      type: 'order', //GSI PK
      creator: ipAddress, //GSI SK
      numItems: input.items.length,
      status: 'WAITING ON CUSTOMER',
      items: input.items.map(i => {
        return {
          size: i.size,
          crust: i.crust,
          toppings: i.toppings,
          sauce: i.sauce
        }
      })
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(item)
    }));

    return {
      statusCode: 201,
      body: JSON.stringify({ id }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  }
};
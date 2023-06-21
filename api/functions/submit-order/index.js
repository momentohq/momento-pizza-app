const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    const status = input.status.toUpperCase();

    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: event.pathParameters.orderId,
        sk: 'metadata'
      })
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'An order with the provided id could not be found.' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }

    const order = unmarshall(result.Item);
    if (order.creator != event.requestContext.identity.sourceIp) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'You are not allowed to update an order with the provided id.' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    }

    if (order.numItems == 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'You cannot submit an order without any items!' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }

    if(!['WAITING ON CUSTOMER', 'SUBMITTED'].includes(order.status)){
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'The order is not in a valid status to submit!' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: event.pathParameters.orderId,
        sk: 'metadata'
      }),
      UpdateExpression: 'SET #status = :status, #lastUpdated = :lastUpdated',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#lastUpdated': 'lastUpdated'
      },
      ExpressionAttributeValues: marshall({
        ':status': status,
        ':lastUpdated': new Date().toISOString()
      })
    }));

    return {
      statusCode: 204,
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
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
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
    const status = input.status.toUpperCase();
    const isValid = isValidStatus(order.status, status);
    if (!isValid) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'The provided status is invalid for the state of the order' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: event.pathParameters.orderId,
        sk: 'metadata'
      }),
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':status': input.status,
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

const isValidStatus = (existingStatus, newStatus) => {
  let isValid = false;
  if (existingStatus == 'SUBMITTED' && ['IN PROGRESS', 'REJECTED'].includes(newStatus)) {
    isValid = true;
  } else if (existingStatus == 'IN PROGRESS' && ['REJECTED', 'COMPLETED'].includes(newStatus)) {
    isValid = true;
  } else if (existingStatus == newStatus) {
    isValid = true;
  }

  return isValid;
};
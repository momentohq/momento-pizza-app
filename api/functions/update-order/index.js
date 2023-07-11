const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    const timestamp = new Date().toISOString();
    try {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: event.pathParameters.orderId,
          sk: 'metadata'
        }),
        UpdateExpression: 'SET #numItems = :numItems, #lastUpdated = :lastUpdated, #items = :items',
        ConditionExpression: 'attribute_exists(#pk) and #creator = :creator and (#status = :waiting or #status = :submitted)',
        ExpressionAttributeNames: {
          '#numItems': 'numItems',
          '#pk': 'pk',
          '#creator': 'creator',
          '#lastUpdated': 'lastUpdated',
          '#status': 'status',
          '#items': 'items'
        },
        ExpressionAttributeValues: marshall({
          ':numItems': input.items.length,
          ':creator': event.requestContext.identity.sourceIp,
          ':lastUpdated': timestamp,
          ':waiting': 'WAITING ON CUSTOMER',
          ':submitted': 'SUBMITTED',
          ':items': input.items.map(i => {
            return {
              size: i.size,
              crust: i.crust,
              sauce: i.sauce,
              toppings: i.toppings
            }
          })
        })
      }));
    } catch (error) {
      if (error.name == 'ConditionalCheckFailedException') {
        return {
          statusCode: 403,
          body: JSON.stringify({ message: 'You are not allowed to update the requested order.' }),
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      } else {
        throw error;
      }
    }

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
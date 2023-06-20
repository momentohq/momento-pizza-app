const { DynamoDBClient, UpdateItemCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    let oldNumberOfItems;
    try {
      const result = await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: event.pathParameters.orderId,
          sk: 'metadata'
        }),
        UpdateExpression: 'SET #numItems = :numItems',
        ConditionExpression: 'attribute_exists(#pk) and #creator = :creator',
        ExpressionAttributeNames: {
          '#numItems': 'numItems',
          '#pk': 'pk',
          '#creator': 'creator'
        },
        ExpressionAttributeValues: marshall({
          ':numItems': input.items.length,
          ':creator': event.requestContext.identity.sourceIp
        }),
        ReturnValues: 'UPDATED_OLD'
      }));

      oldNumberOfItems = result.Attributes.numItems.N;
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

    const timestamp = new Date().toISOString();
    const newItems = input.items.map((item, index) => {
      return {
        PutRequest: {
          Item: marshall(
            {
              pk: event.pathParameters.orderId,
              sk: `item#${index}`,
              size: item.size,
              crust: item.crust,
              toppings: item.toppings,
              sauce: item.sauce,
              lastUpdate: timestamp
            }
          )
        }
      };
    });

    const deleteItems = [];
    if (oldNumberOfItems > input.items.length) {
      for (let index = input.items.length; index < oldNumberOfItems; index++) {
        deleteItems.push({
          DeleteRequest: {
            Key: marshall({
              pk: event.pathParameters.orderId,
              sk: `item#${index}`
            })
          }
        });
      }
    }

    await ddb.send(new BatchWriteItemCommand({
      RequestItems: {
        [process.env.TABLE_NAME]: [
          ...newItems,
          ...deleteItems
        ]
      }
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
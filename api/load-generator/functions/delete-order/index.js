const { DynamoDBClient, QueryCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (state) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'pk'
      },
      ExpressionAttributeValues: marshall({
        ':pk': state.orderId
      })
    }));

    if (result.Items.length) {
      const deleteRequests = result.Items.map(item => {
        return {
          DeleteRequest: {
            Key: {
              pk: item.pk,
              sk: item.sk
            }
          }
        }
      });

      await ddb.send(new BatchWriteItemCommand({
        RequestItems: {
          [process.env.TABLE_NAME]: deleteRequests
        }
      }));
    }

    return { success: true };
  } catch (err) {
    console.error(err);
    throw err;
  }
};
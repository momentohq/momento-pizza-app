const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const results = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'type',
      KeyConditionExpression: '#type = :type',
      FilterExpression: '#status <> :status',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':type': 'order',
        ':status': 'COMPLETED'
      })
    }));

    const orders = results.Items.map(item => {
      const orderData = unmarshall(item);
      return {
        id: orderData.pk,
        createdAt: orderData.createdAt,
        status: orderData.status,
        numItems: orderData.numItems,
        ...orderData.lastUpdated && { lastUpdated: orderData.lastUpdated }
      }
    });

    orders.sort((a, b) => {
      const timestampA = new Date(a.createdAt).getTime();
      const timestampB = new Date(b.createdAt).getTime();
      return timestampA - timestampB;
    });

    return {
      statusCode: 200,
      body: JSON.stringify(orders),
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  }
};
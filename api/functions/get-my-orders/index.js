const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const ipAddress = event.requestContext.identity.sourceIp;

    const results = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'type',
      KeyConditionExpression: '#type = :type and #creator = :creator',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#creator': 'creator'
      },
      ExpressionAttributeValues: marshall({
        ':type': 'order',
        ':creator': ipAddress
      })
    }));

    const orders = [];
    results.Items.map(item => {
      const data = unmarshall(item);
      orders.push({
        id: data.pk,
        createdAt: data.createdAt,
        status: data.status,
        numItems: data.numItems
      })
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
}

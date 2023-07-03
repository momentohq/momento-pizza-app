const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const start = new Date();
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
    
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    metrics.addMetric('get-all-orders-latency', MetricUnits.Milliseconds, (new Date().getTime() - start.getTime()));
    metrics.publishStoredMetrics();

    return {
      statusCode: 200,
      body: JSON.stringify(orders),
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
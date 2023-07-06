const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const ddb = new DynamoDBClient();
const secrets = new SecretsManagerClient();
let cacheClient;

exports.handler = async (event) => {
  try {
    await initializeMomento();
    const start = new Date();

    const cacheResult = await cacheClient.get('pizza', 'all-orders');
    if (cacheResult instanceof CacheGet.Hit) {
      metrics.addMetric('get-all-orders-latency', MetricUnits.Milliseconds, (new Date().getTime() - start.getTime()));
      metrics.addMetric('get-all-orders-cache-hit', MetricUnits.Count, 1);
      metrics.publishStoredMetrics();
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    } else if (cacheResult instanceof CacheGet.Error) {
      console.error(cacheResult.errorCode, cacheResult.message)
    }

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

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const orderResponse = JSON.stringify(orders);
    await cacheClient.set('pizza', 'all-orders', orderResponse);

    metrics.addMetric('get-all-orders-latency', MetricUnits.Milliseconds, (new Date().getTime() - start.getTime()));
    metrics.addMetric('get-all-orders-cache-miss', MetricUnits.Count, 1);
    metrics.publishStoredMetrics();

    return {
      statusCode: 200,
      body: orderResponse,
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

const initializeMomento = async () => {
  if (cacheClient) {
    return;
  }

  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);
  cacheClient = new CacheClient({
    configuration: Configurations.Laptop.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });
};
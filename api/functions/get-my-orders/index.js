const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const ddb = new DynamoDBClient();
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
let cacheClient;

exports.handler = async (event) => {
  try {
    const totalstart = new Date();

    // Determine the cache item key we are interested in - tracking customer by source IP for this example
    const ipAddress = event.requestContext.identity.sourceIp;

    // Initialize Momento session
    await initializeMomento();

    // Record the time stamp of the beginning of the cache check
    const momstart = new Date();

    // Check for the item in the cache
    const cacheResult = await cacheClient.get('pizza', ipAddress);

    // If the item is found in the cache, record metric for end of cache operation latency and record as a cache hit.
    // Close out total latency metric. Publish to CloudWatch, then return the result to the API call and close out the function.
    if (cacheResult instanceof CacheGet.Hit) {
      metrics.addMetric('get-my-orders-latency-cache', MetricUnits.Milliseconds, (new Date().getTime() - momstart.getTime()));
      metrics.addMetric('get-my-orders-cache-hit', MetricUnits.Count, 1);
      metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()));
      metrics.publishStoredMetrics();
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    };

    // Item was not found in the cache - so we'll check the database instead.
    const ddbstart = new Date();

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
        numItems: data.numItems,
        ...data.lastUpdated && { lastUpdated: data.lastUpdated }
      })
    });

    metrics.addMetric('get-my-orders-latency-ddb', MetricUnits.Milliseconds, (new Date().getTime() - ddbstart.getTime()));
    metrics.addMetric('get-my-orders-cache-miss', MetricUnits.Count, 1);

    // Close out the total latency metric (includes cache miss, database read, copy to cache) and publish to CW.
    metrics.addMetric('get-my-orders-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()));
    metrics.publishStoredMetrics();
    
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const orderResponse = JSON.stringify(orders);
    await cacheClient.set('pizza', ipAddress, orderResponse);
    
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

// Setup the connection to Momento Cache - but only if it isn't already present.
const initializeMomento = async () => {
  if (cacheClient) {
    return;
  };

  // Get our Momento Cache auth token from AWS Secrets Manager
  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);

  // Initialize Momento Cache session using default tuning for in-region clients, token from secrets manager, and a default TTL of 60s
  cacheClient = new CacheClient({
    configuration: Configurations.InRegion.Default.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });
};
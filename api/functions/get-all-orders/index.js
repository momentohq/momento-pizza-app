const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const ddb = new DynamoDBClient();
/* Enable for Caching
// load SecretsManager and Momento SDKs
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
let cacheClient;
*/

exports.handler = async (event) => {
  try {
    // Record starting time for the overall function
    const totalstart = new Date();

    /* Enable for Caching
    // Initialize Momento session
    await initializeMomento();

    // Record the time stamp of the beginning of the cache check
    const momstart = new Date();

    // Check for the item in the cache
    const cacheResult = await cacheClient.get('pizza', 'all-orders');

    // If the item is found in the cache, record metric for end of cache operation latency and record as a cache hit.
    // Close out total latency metric. Publish to CloudWatch, then return the result to the API call and close out the function.
    if(cacheResult instanceof CacheGet.Hit){
      metrics.addMetric('get-all-orders-latency-cache', MetricUnits.Milliseconds, (new Date().getTime() - momstart.getTime()));
      metrics.addMetric('get-all-orders-cache-hit', MetricUnits.Count, 1);
      metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()));
      metrics.publishStoredMetrics();
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    };
    */

    // Item was not found in the cache - so we'll check the database instead.
    const ddbstart = new Date();
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

    // Record latency results for the DynamoDB Query
    metrics.addMetric('get-all-orders-latency-ddb', MetricUnits.Milliseconds, (new Date().getTime() - ddbstart.getTime()));

    /* Enable for Caching
    // Construct the value for writing back to the cache
    const orderResponse = JSON.stringify(orders);

    await cacheClient.set('pizza', 'all-orders', orderResponse);
    */

    // Record the cache check as a miss
    metrics.addMetric('get-all-orders-cache-miss', MetricUnits.Count, 1);
  
    // Close out the total latency metric and publish to CW
    metrics.addMetric('get-all-orders-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()))
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

/* Enable for Caching
// Setup the connection to Momento Cache - but only if it isn't already present.
const initializeMomento = async () => {
  if(cacheClient){
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
*/
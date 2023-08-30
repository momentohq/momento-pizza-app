const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const ddb = new DynamoDBClient();
// load SecretsManager and Momento SDKs - best practice is to initialize outside the main handler
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
let cacheClient;
let cacheResult;

exports.handler = async (event) => {
  try {

    // Initialize Momento session
    await initializeMomento();

    // Record the time stamp of the beginning of the cache check
    const momentoStart = new Date();

    // Check for the item in the cache
    // *** Uncomment line below to enable caching
    // cacheResult = await cacheClient.get('pizza', 'all-orders');

    // Record elapsed time for cache check
    const momentoTime = (new Date().getTime() - momentoStart.getTime());
    metrics.addMetric('get-all-orders-latency-cache', MetricUnits.Milliseconds, momentoTime);

    if(cacheResult instanceof CacheGet.Error){
      // Oops
      console.error(`Something went wrong! ${cacheResult.toString()}`);
      throw cacheResult.innerException();
    } elseif(cacheResult instanceof CacheGet.Hit){
    // If the item is found in the cache, record metric for end of cache operation latency and record as a cache hit.
    // Close out total latency metric. Publish to CloudWatch, then return the result to the API call and close out the function.
      metrics.addMetric('get-all-orders-cache-hit', MetricUnits.Count, 1);
      metrics.addMetric('get-all-orders-latency-total', MetricUnits.Milliseconds, momentoTime);
      metrics.publishStoredMetrics();
      // Delete the all-orders cache entry some of the time - to simulate some misses and gather enough datapoints for latency
      // of going to the database directly.
      // *** Uncomment lines below to enable caching
      // if(Math.random() > 0.95){
      //   await cacheClient.delete('pizza', 'all-orders');
      // };
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    } else {
      // Item was not found in the cache - so we'll check the database instead.
      // Record the cache miss and time stamp of beginning of DDB read call.

      metrics.addMetric('get-all-orders-cache-miss', MetricUnits.Count, 1);

      const ddbStart = new Date();

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

      // Note the time spent in reading from DynamoDB.

      const ddbTime = (new Date().getTime() - ddbStart.getTime());
      metrics.addMetric('get-all-orders-latency-ddb', MetricUnits.Milliseconds, ddbTime);

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
      const orderResponse = JSON.stringify(orders);

      // Record start time of writing back the data to the cache
      const writebackStart = new Date();

      // Copy the data into the proper cache item (ready for next read)
      // *** Uncomment line below to enable caching
      // await cacheClient.set('pizza', 'all-orders', orderResponse);

      // Record elapsed time for writeback to cache
      const writebackTime = (new Date().getTime() - writebackStart.getTime());
  
      // Close out the total latency metric (includes cache miss, database read, copy to cache), cache miss and publish to CW.
      metrics.addMetric('get-all-orders-latency-total', MetricUnits.Milliseconds, (ddbTime + momentoTime + writebackTime));
      metrics.publishStoredMetrics();

      return {
        statusCode: 200,
        body: orderResponse,
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }
  } catch (err) {
    console.error(err);
    return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Something went wrong' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
  };
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
    configuration: Configurations.Lambda.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });
};